// ─────────────────────────────────────────────────────────────
// src/database/adapters/web.adapter.ts
//
// Browser adapter — sql.js (SQLite WASM) + IndexedDB persistence.
//
// Fix: sql.js exports initSqlJs differently depending on the
// bundler / module system. We probe all three export shapes:
//   1. module.default        (ESM default export)
//   2. module.default.default (double-wrapped — Vite quirk)
//   3. module itself         (CJS interop — most common in Vite)
//
// If the npm package fails entirely we fall back to loading
// sql.js directly from the CDN via a <script> tag, which is
// the most reliable approach in a browser environment.
// ─────────────────────────────────────────────────────────────

export interface DBAdapter {
  exec(sql: string, params?: unknown[]): Promise<unknown[][]>;
  run(sql: string, params?: unknown[]): Promise<void>;
  close(): Promise<void>;
}

const SQLJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2";

let _db:  unknown = null;
let _SQL: unknown = null;

// ── sql.js initialiser — robust across all bundler shapes ────

async function loadSqlJs(): Promise<unknown> {
  if (_SQL) return _SQL;

  // Attempt 1: npm package via dynamic import
  try {
    const mod = await import("sql.js");

    const candidates: unknown[] = [
      (mod as any).default?.default,   // double-wrap (some Vite configs)
      (mod as any).default,            // standard ESM default
      (mod as any).initSqlJs,          // named export
      mod,                             // bare CJS object
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "function") {
        _SQL = await (candidate as Function)({
          locateFile: (file: string) => `${SQLJS_CDN}/${file}`,
        });
        return _SQL;
      }
    }
  } catch {
    // npm import failed — fall through to CDN script tag
  }

  // Attempt 2: CDN <script> tag (most reliable in plain browser envs)
  _SQL = await loadSqlJsFromCDN();
  return _SQL;
}

function loadSqlJsFromCDN(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (typeof (window as any).initSqlJs === "function") {
      resolve(
        (window as any).initSqlJs({
          locateFile: (f: string) => `${SQLJS_CDN}/${f}`,
        })
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `${SQLJS_CDN}/sql-wasm.js`;
    script.onload = () => {
      const init = (window as any).initSqlJs;
      if (typeof init !== "function") {
        reject(new Error("initSqlJs not found on window after CDN load"));
        return;
      }
      resolve(init({ locateFile: (f: string) => `${SQLJS_CDN}/${f}` }));
    };
    script.onerror = () => reject(new Error("Failed to load sql.js from CDN"));
    document.head.appendChild(script);
  });
}

// ── DB instance getter ────────────────────────────────────────

async function getDB(): Promise<unknown> {
  if (_db) return _db;

  const SQL = await loadSqlJs() as any;
  const persisted = await loadFromIndexedDB();
  _db = persisted ? new SQL.Database(persisted) : new SQL.Database();

  return _db;
}

// ── IndexedDB persistence ─────────────────────────────────────

async function loadFromIndexedDB(): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open("theshop_db", 1);
      req.onupgradeneeded = (e) => {
        (e.target as IDBOpenDBRequest).result.createObjectStore("db");
      };
      req.onsuccess = (e) => {
        const idb = (e.target as IDBOpenDBRequest).result;
        const tx  = idb.transaction("db", "readonly");
        const get = tx.objectStore("db").get("data");
        get.onsuccess = () => resolve(get.result ?? null);
        get.onerror   = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveToIndexedDB(data: Uint8Array): Promise<void> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open("theshop_db", 1);
      req.onupgradeneeded = (e) => {
        (e.target as IDBOpenDBRequest).result.createObjectStore("db");
      };
      req.onsuccess = (e) => {
        const idb = (e.target as IDBOpenDBRequest).result;
        const tx  = idb.transaction("db", "readwrite");
        tx.objectStore("db").put(data, "data");
        tx.oncomplete = () => resolve();
        tx.onerror    = () => resolve();
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
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
