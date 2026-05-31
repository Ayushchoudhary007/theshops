// ─────────────────────────────────────────────────────────────
// src/database/index.ts
//
// Picks the right adapter at runtime:
//   Capacitor (iOS / Android) → NativeAdapter
//   Everything else           → WebAdapter
// ─────────────────────────────────────────────────────────────

import type { DBAdapter } from "./adapter/native.adapter";
import { CREATE_TABLES, SEED_META } from "./schema";

let _adapter: DBAdapter | null = null;
let _initialized = false;

function isNative(): boolean {
  return (
    typeof (window as any)?.Capacitor !== "undefined" &&
    (window as any).Capacitor.isNativePlatform()
  );
}

export async function getAdapter(): Promise<DBAdapter> {
  if (_adapter) return _adapter;

  if (isNative()) {
    const { NativeAdapter } = await import("./adapter/native.adapter");
    _adapter = NativeAdapter;
  } else {
    const { WebAdapter } = await import("./adapter/web.adapter");
    _adapter = WebAdapter;
  }

  return _adapter;
}

/** Call once at app startup (e.g. in main.tsx) */
export async function initDatabase(): Promise<void> {
  if (_initialized) return;

  const db = await getAdapter();
  // Run DDL — CREATE TABLE IF NOT EXISTS is safe to repeat
  for (const stmt of CREATE_TABLES.split(";").map((s) => s.trim()).filter(Boolean)) {
    await db.run(stmt);
  }
  await db.run(SEED_META);
  _initialized = true;

  console.log("[DB] Initialized ✓");
}

/** Low-level query helper used by services */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const db = await getAdapter();
  return db.exec(sql, params) as unknown as T[];
}

/** Low-level write helper */
export async function run(sql: string, params: unknown[] = []): Promise<void> {
  const db = await getAdapter();
  await db.run(sql, params);
}

/** Wipes all user data from the local DB on logout.
 *  Keeps device_id in meta so the device is still recognised on next login.
 *  Resets sync timestamps so the next login pulls everything fresh from server.
 */
export async function clearUserData(): Promise<void> {
  const tables = [
    "bill_items",
    "bills",
    "inventory",
    "customers",
    "notifications",
    "barcode_cache",
    "sync_queue",
  ];
  for (const t of tables) {
    try { await run(`DELETE FROM ${t}`); } catch { /* table may not exist yet */ }
  }
  // Reset sync timestamps — forces full pull on next login
  const syncKeys = [
    "last_bills_pull",
    "last_inventory_pull",
    "last_inventory_push",
    "last_sync_at",
    "shop_name",
    "shop_address",
    "shop_gst",
    "tax_rate",
  ];
  for (const k of syncKeys) {
    try { await run("DELETE FROM meta WHERE key = ?", [k]); } catch { /* ok */ }
  }
  console.log("[DB] User data cleared ✓");
}
