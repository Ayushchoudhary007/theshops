// ─────────────────────────────────────────────────────────────
// src/database/adapters/native.adapter.ts
//
// Native (Capacitor) adapter — uses @capacitor-community/sqlite
// for iOS and Android.
// ─────────────────────────────────────────────────────────────

import type { DBAdapter } from "./web.adapter";
export type { DBAdapter } from "./web.adapter";
let _db: unknown = null;
const DB_NAME = "theshop";

async function getDB(): Promise<unknown> {
  if (_db) return _db;

  const { CapacitorSQLite, SQLiteConnection } = await import(
    "@capacitor-community/sqlite"
  );

  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const isConn = (await sqlite.isConnection(DB_NAME, false)).result;

  _db = isConn
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);

  await (_db as any).open();
  return _db;
}

export const NativeAdapter: DBAdapter = {
  async exec(sql: string, params: unknown[] = []): Promise<unknown[][]> {
    const db = await getDB() as any;
    const result = await db.query(sql, params);
    return result.values ?? [];
  },

  async run(sql: string, params: unknown[] = []): Promise<void> {
    const db = await getDB() as any;
    await db.run(sql, params.map(String));
  },

  async close(): Promise<void> {
    if (_db) {
      await (_db as any).close();
      _db = null;
    }
  },
};
