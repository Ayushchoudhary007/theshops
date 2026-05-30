// src/database/adapter/web.adapter.ts
//
// Browser SQLite adapter using sql.js (WebAssembly) + IndexedDB persistence.
//
// WASM loading strategy:
// - sql-wasm-browser.js is the browser-optimised build of sql.js
// - It requests "sql-wasm-browser.wasm" via locateFile
// - Both files are copied to public/ by scripts/copy-wasm.cjs at build time
// - Served from the SAME ORIGIN — required for Cross-Origin-Embedder-Policy
//
// DO NOT use dynamic import("sql.js") — it fails silently under COEP because
// the npm package is not marked crossorigin. Import statically instead.

// @ts-ignore — sql.js has no types for the browser bundle path
import initSqlJs from "sql.js/dist/sql-wasm-browser.js";

export interface DBAdapter {
  exec(sql: string, params?: unknown[]): Promise<unknown[][]>;
  run(sql: string, params?: unknown[]): Promise<void>;
  close(): Promise<void>;
}

let _db:  unknown = null;
let _SQL: unknown = null;

// ── sql.js initialiser ────────────────────────────────────────

async function loadSqlJs(): Promise<unknown> {
  if (_SQL) return _SQL;

  _SQL = await (initSqlJs as Function)({
    // Both files are in public/ → served from same origin as the app.
    // sql-wasm-browser.js calls locateFile("sql-wasm-browser.wasm") to find the binary.
    locateFile: (file: string) => `/${file}`,
  });

  return _SQL;
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
    return new Promise(resolve => {
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
    await new Promise<void>(resolve => {
      const tx = idb.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(data, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => resolve();
    });
  } catch {
    // Non-fatal — data is in memory
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
