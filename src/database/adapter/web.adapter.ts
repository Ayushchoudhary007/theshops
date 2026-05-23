// src/database/adapters/web.adapter.ts
//
// Browser adapter — sql.js (SQLite WASM) + IndexedDB persistence.
//
// The WASM binary is served from /sql-wasm.wasm (copied to public/ at build time).
// This avoids CDN dependencies, version mismatches, and works fully offline.
// It also satisfies the Cross-Origin-Embedder-Policy requirement because the
// file is served from the same origin as the app.

export interface DBAdapter {
  exec(sql: string, params?: unknown[]): Promise<unknown[][]>;
  run(sql: string, params?: unknown[]): Promise<void>;
  close(): Promise<void>;
}

let _db:  unknown = null;
let _SQL: unknown = null;

// ── sql.js initialiser ────────────────────────────────────────
// Loads the WASM from /sql-wasm.wasm (same origin, always correct version).
// Falls back to CDN only if the local file can't be found (shouldn't happen
// in production but handles local dev without public/ copied).

async function loadSqlJs(): Promise<unknown> {
  if (_SQL) return _SQL;

  // Attempt 1: npm package with local WASM file (production path)
  try {
    const mod = await import("sql.js");

    const candidates: unknown[] = [
      (mod as any).default?.default,
      (mod as any).default,
      (mod as any).initSqlJs,
      mod,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "function") {
        _SQL = await (candidate as Function)({
          // Point locateFile to the WASM served from our own origin.
          // In production (Vercel) this is https://yourapp.vercel.app/sql-wasm.wasm
          // In dev this is http://localhost:5173/sql-wasm.wasm
          locateFile: (file: string) => `/${file}`,
        });
        return _SQL;
      }
    }
  } catch {
    // npm import failed — fall through to CDN fallback
  }

  // Attempt 2: CDN fallback — uses the version matching our package.json
  // sql.js 1.14.1 is at this CDN path
  const CDN = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.14.1";
  _SQL = await loadSqlJsFromCDN(CDN);
  return _SQL;
}

function loadSqlJsFromCDN(cdn: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (typeof (window as any).initSqlJs === "function") {
      resolve(
        (window as any).initSqlJs({ locateFile: (f: string) => `${cdn}/${f}` })
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `${cdn}/sql-wasm.js`;
    script.onload = () => {
      const init = (window as any).initSqlJs;
      if (typeof init !== "function") {
        reject(new Error("initSqlJs not found on window after CDN load"));
        return;
      }
      resolve(init({ locateFile: (f: string) => `${cdn}/${f}` }));
    };
    script.onerror = () => reject(new Error(`Failed to load sql.js from CDN: ${cdn}`));
    document.head.appendChild(script);
  });
}

// ── DB instance getter ────────────────────────────────────────

async function getDB(): Promise<unknown> {
  if (_db) return _db;

  const SQL   = await loadSqlJs() as any;
  const saved = await loadFromIndexedDB();
  _db = saved ? new SQL.Database(saved) : new SQL.Database();

  return _db;
}

// ── IndexedDB persistence ─────────────────────────────────────

const IDB_NAME    = "theshop_db";
const IDB_VERSION = 1;
const IDB_STORE   = "db";
const IDB_KEY     = "data";

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = e =>
      (e.target as IDBOpenDBRequest).result.createObjectStore(IDB_STORE);
    req.onsuccess = e => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror   = () => reject(req.error);
  });
}

async function loadFromIndexedDB(): Promise<Uint8Array | null> {
  try {
    const idb = await openIDB();
    return new Promise((resolve) => {
      const tx  = idb.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveToIndexedDB(data: Uint8Array): Promise<void> {
  try {
    const idb = await openIDB();
    await new Promise<void>((resolve) => {
      const tx = idb.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(data, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => resolve();
    });
  } catch {
    // Non-fatal — data is still in memory
  }
}

// ── Adapter ───────────────────────────────────────────────────

export const WebAdapter: DBAdapter = {
  async exec(sql: string, params: unknown[] = []): Promise<unknown[][]> {
    const db = await getDB() as any;

    if (params.length > 0) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows: unknown[] = [];
      const cols: string[]  = stmt.getColumnNames();
      while (stmt.step()) {
        const row = stmt.get();
        rows.push(Object.fromEntries(cols.map((c, i) => [c, row[i]])));
      }
      stmt.free();
      return rows as any;
    }

    const results = db.exec(sql);
    if (!results.length) return [];
    const { columns, values } = results[0];
    return values.map((row: unknown[]) =>
      Object.fromEntries(columns.map((col: string, i: number) => [col, row[i]]))
    ) as any;
  },

  async run(sql: string, params: unknown[] = []): Promise<void> {
    const db = await getDB() as any;

    if (params.length > 0) {
      const stmt = db.prepare(sql);
      stmt.run(params);
      stmt.free();
    } else {
      db.run(sql);
    }

    await saveToIndexedDB(db.export());
  },

  async close(): Promise<void> {
    if (_db) {
      (_db as any).close();
      _db  = null;
      _SQL = null;
    }
  },
};
