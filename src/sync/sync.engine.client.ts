// src/sync/sync.engine.client.ts
//
// Bidirectional sync engine — wired to TheShop Server v4 (PostgreSQL).
//
// Endpoints used:
//   POST /api/sync/bills          push unsynced bills + items
//   GET  /api/sync/bills          pull bills from other devices
//   POST /api/sync/inventory      push inventory changes
//   GET  /api/sync/inventory      pull inventory from server
//   POST /api/sync/customers      push unsynced customers
//   GET  /api/sync/customers      pull customers
//   POST /api/sync/notifications  push local notifications
//   GET  /api/sync/status         last sync timestamps per table
//   GET  /api/settings            pull shop settings → local meta
//   PATCH /api/settings           push local meta → server

import { query, run } from "../database";
import { getNetworkState } from "../hooks/useNetworkStatus";

// ── Simple event emitter ──────────────────────────────────────

type EventMap = { change: [] };

class SyncEventEmitter {
  private listeners: Map<string, Set<() => void>> = new Map();
  on<K extends keyof EventMap>(event: K, fn: () => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
  }
  off<K extends keyof EventMap>(event: K, fn: () => void) {
    this.listeners.get(event)?.delete(fn);
  }
  emit<K extends keyof EventMap>(event: K) {
    this.listeners.get(event)?.forEach(fn => fn());
  }
}

export const syncEvents = new SyncEventEmitter();

// ── Auth / server helpers ─────────────────────────────────────

const K_TOKEN  = "theshop_auth_token";

function getServerBase(): string {
  const raw = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").trim().replace(/\/$/, "");
  // Guard: if env var is set without https:// (e.g. "myapp.railway.app"),
  // treat it as https to prevent fetch resolving it as a relative path
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

function getToken(): string | null {
  const t = localStorage.getItem(K_TOKEN);
  return !t || t === "offline" ? null : t;
}

function getShopId(): string | null {
  try {
    const raw = localStorage.getItem("theshop_auth_user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    // Owner: first shop; Manager/Staff: shopId field
    return user?.shops?.[0]?.id ?? user?.shopId ?? null;
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${getServerBase()}${path}`, {
      ...options,
      headers: { ...authHeaders(), ...(options.headers ?? {}) },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: (body as any).error ?? `HTTP ${res.status}` };
    }
    return { data: await res.json(), error: null };
  } catch (e: any) {
    return { data: null, error: e?.message ?? "Network error" };
  }
}

// ── Device ID ─────────────────────────────────────────────────

let _deviceId: string | null = null;

async function getDeviceId(): Promise<string> {
  if (_deviceId) return _deviceId;
  const rows = await query<{ value: string }>("SELECT value FROM meta WHERE key='device_id'");
  if (rows.length) { _deviceId = rows[0].value; return _deviceId; }
  const id = crypto.randomUUID();
  await run("INSERT OR REPLACE INTO meta (key, value) VALUES ('device_id', ?)", [id]);
  _deviceId = id;
  return id;
}

// ── Meta helpers ──────────────────────────────────────────────

async function getMeta(key: string): Promise<string | null> {
  const rows = await query<{ value: string }>("SELECT value FROM meta WHERE key = ?", [key]);
  return rows[0]?.value ?? null;
}

async function setMeta(key: string, value: string): Promise<void> {
  await run("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", [key, value]);
}

// ═══════════════════════════════════════════════════════════════
//  SYNC ENGINE
// ═══════════════════════════════════════════════════════════════

export class SyncEngine {
  private running = false;

  async sync(): Promise<void> {
    if (this.running) return;
    if (!getNetworkState().isOnline) return;

    const token  = getToken();
    const shopId = getShopId();
    if (!token || !shopId) return; // not logged in or no shop yet

    this.running = true;
    try {
      await this.pullSettings(shopId);
      await this.pushBills(shopId);
      await this.pullBills(shopId);
      await this.pushInventory(shopId);
      await this.pullInventory(shopId);
      await this.pushCustomers(shopId);
      await this.pushNotifications(shopId);
      await setMeta("last_sync_at", new Date().toISOString());
      syncEvents.emit("change");
    } catch (e) {
      console.warn("[SyncEngine] sync error:", e);
    } finally {
      this.running = false;
    }
  }

  // ── Pull shop settings → local meta ──────────────────────

  private async pullSettings(shopId: string): Promise<void> {
    const { data } = await apiFetch<any>(`/api/settings?shopId=${shopId}`);
    if (!data) return;
    const updates: [string, string][] = [
      ["shop_name",    data.shopName    ?? ""],
      ["shop_address", data.shopAddress ?? ""],
      ["shop_gst",     data.shopGst     ?? ""],
      ["tax_rate",     String(data.taxRate ?? 18)],
    ];
    for (const [k, v] of updates) {
      await run("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", [k, v]);
    }
  }

  // ── Push unsynced bills → server ─────────────────────────

  private async pushBills(shopId: string): Promise<void> {
    const deviceId = await getDeviceId();
    const bills = await query<any>(
      "SELECT * FROM bills WHERE syncedAt IS NULL ORDER BY createdAt ASC LIMIT 100"
    );
    if (!bills.length) return;

    const withItems = await Promise.all(
      bills.map(async (b: any) => {
        const items = await query("SELECT * FROM bill_items WHERE bill_id = ?", [b.id]);
        return { ...b, items };
      })
    );

    const { data, error } = await apiFetch<{ synced: number }>("/api/sync/bills", {
      method: "POST",
      body: JSON.stringify({ shopId, bills: withItems, deviceId }),
    });

    if (!error && data) {
      const ts = new Date().toISOString();
      for (const bill of bills) {
        await run("UPDATE bills SET syncedAt = ? WHERE id = ?", [ts, bill.id]);
      }
      syncEvents.emit("change");
    }
  }

  // ── Pull bills from server → local ──────────────────────

  private async pullBills(shopId: string): Promise<void> {
    const since = await getMeta("last_bills_pull");
    const qs    = since ? `&since=${encodeURIComponent(since)}` : "";

    const { data: bills, error } = await apiFetch<any[]>(
      `/api/sync/bills?shopId=${shopId}${qs}`
    );
    if (error || !bills?.length) return;

    const ts = new Date().toISOString();
    for (const bill of bills) {
      try {
        await run(
          `INSERT OR IGNORE INTO bills
            (bill_number, customer_id, customer_name, customer_phone,
             subtotal, discount, tax_rate, tax_amount, total,
             payment_mode, status, notes, createdAt, syncedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            bill.bill_number ?? bill.billNumber,
            bill.customer_id ?? bill.customerId ?? null,
            bill.customer_name ?? bill.customerName ?? "",
            bill.customer_phone ?? bill.customerPhone ?? "",
            bill.subtotal ?? 0, bill.discount ?? 0,
            bill.tax_rate ?? bill.taxRate ?? 18,
            bill.tax_amount ?? bill.taxAmount ?? 0,
            bill.total ?? 0,
            bill.payment_mode ?? bill.paymentMode ?? "cash",
            bill.status ?? "paid", bill.notes ?? "",
            bill.createdAt ?? bill.created_at ?? ts, ts,
          ]
        );
        // Insert items for newly inserted bills
        const local = await query<{ id: number }>(
          "SELECT id FROM bills WHERE bill_number = ?",
          [bill.bill_number ?? bill.billNumber]
        );
        if (local[0] && Array.isArray(bill.items)) {
          for (const item of bill.items) {
            await run(
              `INSERT OR IGNORE INTO bill_items
                (bill_id, inventory_id, name, sku, quantity, unit_price, total_price)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                local[0].id,
                item.inventory_id ?? item.inventoryId ?? null,
                item.name ?? "", item.sku ?? "",
                item.quantity ?? 1,
                item.unit_price ?? item.unitPrice ?? 0,
                item.total_price ?? item.totalPrice ?? 0,
              ]
            );
          }
        }
      } catch {
        // Already exists locally — skip
      }
    }

    await setMeta("last_bills_pull", ts);
    syncEvents.emit("change");
  }

  // ── Push inventory changes → server ─────────────────────

  private async pushInventory(shopId: string): Promise<void> {
    const deviceId = await getDeviceId();
    const since = await getMeta("last_inventory_push");
    const items: any[] = since
      ? await query("SELECT * FROM inventory WHERE lastUpdated >= ? LIMIT 200", [since])
      : await query("SELECT * FROM inventory LIMIT 200");

    if (!items.length) return;

    const { error } = await apiFetch("/api/sync/inventory", {
      method: "POST",
      body: JSON.stringify({ shopId, items, deviceId }),
    });

    if (!error) {
      await setMeta("last_inventory_push", new Date().toISOString());
    }
  }

  // ── Pull inventory from server → local ──────────────────

  private async pullInventory(shopId: string): Promise<void> {
    const since = await getMeta("last_inventory_pull");
    const qs    = since ? `&since=${encodeURIComponent(since)}` : "";

    const { data: items, error } = await apiFetch<any[]>(
      `/api/sync/inventory?shopId=${shopId}${qs}`
    );
    if (error || !items?.length) return;

    const ts = new Date().toISOString();
    for (const item of items) {
      try {
        await run(
          `INSERT INTO inventory
            (name, category, brand, price, stock, image, sku, barcode, status, lastUpdated, syncedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(sku) DO UPDATE SET
             name=excluded.name, category=excluded.category, brand=excluded.brand,
             price=excluded.price, stock=excluded.stock, image=excluded.image,
             barcode=excluded.barcode, status=excluded.status,
             lastUpdated=excluded.lastUpdated, syncedAt=excluded.syncedAt
           WHERE excluded.lastUpdated > inventory.lastUpdated`,
          [
            item.name ?? "", item.category ?? "", item.brand ?? "",
            item.price ?? 0, item.stock ?? 0, item.image ?? "",
            item.sku ?? "", item.barcode ?? null,
            item.status ?? "in-stock",
            item.lastUpdated ?? item.last_updated ?? ts, ts,
          ]
        );
      } catch {
        // Skip conflicts
      }
    }

    await setMeta("last_inventory_pull", ts);
    syncEvents.emit("change");
  }

  // ── Push unsynced customers → server ─────────────────────

  private async pushCustomers(shopId: string): Promise<void> {
    const deviceId = await getDeviceId();
    const customers = await query<any>(
      "SELECT * FROM customers WHERE syncedAt IS NULL LIMIT 100"
    );
    if (!customers.length) return;

    const { error } = await apiFetch("/api/sync/customers", {
      method: "POST",
      body: JSON.stringify({ shopId, customers, deviceId }),
    });

    if (!error) {
      const ts = new Date().toISOString();
      for (const c of customers) {
        await run("UPDATE customers SET syncedAt = ? WHERE id = ?", [ts, c.id]);
      }
    }
  }

  // ── Push local notifications → server ────────────────────

  private async pushNotifications(shopId: string): Promise<void> {
    const notifications = await query<any>(
      "SELECT * FROM notifications ORDER BY createdAt DESC LIMIT 50"
    );
    if (!notifications.length) return;

    await apiFetch("/api/sync/notifications", {
      method: "POST",
      body: JSON.stringify({ shopId, notifications }),
    });
  }
}

export const syncEngine = new SyncEngine();

// ── Enqueue helper (kept for backward compat) ─────────────────
// After any local write, call syncEngine.sync() to push immediately

export async function enqueueSync(
  _table: string,
  _operation: string,
  _recordId: number,
  _payload: unknown,
): Promise<void> {
  // In v4 we do direct push via syncEngine — no local queue needed
  // Just trigger a sync attempt if online
  if (getNetworkState().isOnline) {
    syncEngine.sync().catch(console.error);
  }
  syncEvents.emit("change");
}
