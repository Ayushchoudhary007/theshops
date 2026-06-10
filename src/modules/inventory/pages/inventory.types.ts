// ─────────────────────────────────────────────────────────────
// src/modules/inventory/inventory.types.ts
// ─────────────────────────────────────────────────────────────

export type InventoryStatus = "in-stock" | "low-stock" | "out-of-stock";

export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  brand: string;
  price: number;
  stock: number;
  image: string;
  sku: string;
  barcode?: string;         // EAN / UPC from scanner
  status: InventoryStatus;
  lastUpdated:   string;       // ISO date string
  syncedAt?:     string | null; // null = pending sync
  reorder_level?: number;       // stock below this triggers an alert (default 10)
}

export type ViewMode = "grid" | "list";

export type SortBy =
  | "name"
  | "price-low"
  | "price-high"
  | "stock-low"
  | "stock-high"
  | "recent";

// ── Barcode lookup result ────────────────────────────────────
export interface BarcodeLookupResult {
  name: string;
  brand: string;
  category: string;
  image: string;
  barcode: string;
}
