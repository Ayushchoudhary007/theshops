// ─────────────────────────────────────────────────────────────
// src/modules/inventory/inventory.service.ts
//
// All reads and writes go to LOCAL SQLite first.
// Network is never required for any core operation.
// ─────────────────────────────────────────────────────────────

import { query, run } from "../../../database";
import { enqueueSync } from "../../../sync/sync.engine.client";
import { getNetworkState } from "../../../hooks/useNetworkStatus";
import type {
  InventoryItem, InventoryStatus,
  SortBy, BarcodeLookupResult,
} from "../pages/inventory.types";

// ── Helpers ──────────────────────────────────────────────────

function rowToItem(r: Record<string, unknown>): InventoryItem {
  return {
    id:          r.id          as number,
    name:        r.name        as string,
    category:    r.category    as string,
    brand:       r.brand       as string,
    price:       r.price       as number,
    stock:       r.stock       as number,
    image:       r.image       as string,
    sku:         r.sku         as string,
    barcode:     r.barcode     as string | undefined,
    status:      r.status      as InventoryStatus,
    lastUpdated: r.lastUpdated as string,
    syncedAt:    r.syncedAt    as string | null,
  };
}

function calcStatus(stock: number): InventoryStatus {
  if (stock === 0) return "out-of-stock";
  if (stock < 10)  return "low-stock";
  return "in-stock";
}

// ── Service ───────────────────────────────────────────────────

export const InventoryService = {

  // ── READ (always offline) ─────────────────────────────────

  async getAll(): Promise<InventoryItem[]> {
    const rows = await query<Record<string, unknown>>(
      "SELECT * FROM inventory ORDER BY name ASC"
    );
    return rows.map(rowToItem);
  },

  async getById(id: number): Promise<InventoryItem | null> {
    const rows = await query<Record<string, unknown>>(
      "SELECT * FROM inventory WHERE id = ?", [id]
    );
    return rows.length ? rowToItem(rows[0]) : null;
  },

  async getByBarcode(barcode: string): Promise<InventoryItem | null> {
    const rows = await query<Record<string, unknown>>(
      "SELECT * FROM inventory WHERE barcode = ? LIMIT 1", [barcode]
    );
    return rows.length ? rowToItem(rows[0]) : null;
  },

  async getSorted(sortBy: SortBy): Promise<InventoryItem[]> {
    const order: Record<SortBy, string> = {
      "name":       "name ASC",
      "price-low":  "price ASC",
      "price-high": "price DESC",
      "stock-low":  "stock ASC",
      "stock-high": "stock DESC",
      "recent":     "lastUpdated DESC",
    };
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM inventory ORDER BY ${order[sortBy]}`
    );
    return rows.map(rowToItem);
  },

  // ── WRITE (always offline, queued for sync) ───────────────

  async add(item: Omit<InventoryItem, "id" | "syncedAt">): Promise<number> {
    const now    = new Date().toISOString();
    const status = calcStatus(item.stock);

    await run(
      `INSERT INTO inventory
         (name,category,brand,price,stock,image,sku,barcode,status,lastUpdated,syncedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,NULL)`,
      [item.name, item.category, item.brand, item.price, item.stock,
       item.image, item.sku, item.barcode ?? null, status, now],
    );

    const [{ id }] = await query<{ id: number }>(
      "SELECT last_insert_rowid() as id"
    );

    await enqueueSync("inventory", "insert", id,
      { ...item, id, status, lastUpdated: now });

    return id;
  },

  async update(id: number, data: Partial<Omit<InventoryItem, "id">>): Promise<void> {
    const existing = await InventoryService.getById(id);
    if (!existing) throw new Error(`Item ${id} not found`);

    const merged = { ...existing, ...data };
    const now    = new Date().toISOString();
    const status = calcStatus(merged.stock);

    await run(
      `UPDATE inventory
       SET name=?,category=?,brand=?,price=?,stock=?,image=?,sku=?,
           barcode=?,status=?,lastUpdated=?,syncedAt=NULL
       WHERE id=?`,
      [merged.name, merged.category, merged.brand, merged.price, merged.stock,
       merged.image, merged.sku, merged.barcode ?? null, status, now, id],
    );

    await enqueueSync("inventory", "update", id,
      { ...merged, status, lastUpdated: now });
  },

  async delete(id: number): Promise<void> {
    await run("DELETE FROM inventory WHERE id=?", [id]);
    await enqueueSync("inventory", "delete", id, { id });
  },

  // ── BARCODE LOOKUP ────────────────────────────────────────
  //
  // Offline-first:
  //   1. Check local inventory   (always works)
  //   2. Check barcode_cache     (always works, populated when online)
  //   3. Fetch from internet     (online only — graceful degradation)
  //   4. Cache result locally    (so next scan works offline)

  async lookupBarcode(barcode: string): Promise<BarcodeLookupResult | null> {
    // Step 1: already in inventory?
    const existing = await InventoryService.getByBarcode(barcode);
    if (existing) return {
      barcode,
      name: existing.name, brand: existing.brand,
      category: existing.category, image: existing.image,
    };

    // Step 2: cached from a previous online lookup?
    const cached = await query<Record<string, unknown>>(
      "SELECT * FROM barcode_cache WHERE barcode = ? LIMIT 1", [barcode]
    );
    if (cached.length) return {
      barcode,
      name:     cached[0].name     as string,
      brand:    cached[0].brand    as string,
      category: cached[0].category as string,
      image:    cached[0].image    as string,
    };

    // Step 3: online lookup
    if (!getNetworkState().isOnline) return null;

    const result = await fetchBarcodeOnline(barcode);
    if (!result) return null;

    // Step 4: cache for future offline use
    await run(
      `INSERT OR REPLACE INTO barcode_cache
         (barcode, name, brand, category, image, cachedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [barcode, result.name, result.brand, result.category,
       result.image, new Date().toISOString()],
    );

    return result;
  },
};

// ── Online barcode fetch (isolated — never called when offline) ──

async function fetchBarcodeOnline(
  barcode: string
): Promise<BarcodeLookupResult | null> {
  try {
    // Try Open Food Facts (free, no key)
    const r1 = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { signal: AbortSignal.timeout(6000) }
    );
    const d1 = await r1.json();
    if (d1.status === 1 && d1.product) {
      const p = d1.product;
      return {
        barcode,
        name:     p.product_name   ?? "",
        brand:    p.brands         ?? "",
        category: p.categories_tags?.[0]?.replace("en:", "") ?? "",
        image:    p.image_front_url ?? "",
      };
    }

    // Fallback: UPC Item DB (free tier)
    const r2 = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
      { signal: AbortSignal.timeout(6000) }
    );
    const d2 = await r2.json();
    const item = d2.items?.[0];
    if (item) {
      return {
        barcode,
        name:     item.title       ?? "",
        brand:    item.brand       ?? "",
        category: item.category    ?? "",
        image:    item.images?.[0] ?? "",
      };
    }
  } catch {
    // Network failure — silently return null
  }
  return null;
}
