// ─────────────────────────────────────────────────────────────
// src/database/schema.ts  (UPDATED — version 3)
// ─────────────────────────────────────────────────────────────

export const SCHEMA_VERSION = 3;

export const CREATE_TABLES = `
  -- Core inventory
  CREATE TABLE IF NOT EXISTS inventory (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    category    TEXT    NOT NULL DEFAULT '',
    brand       TEXT    NOT NULL DEFAULT '',
    price       REAL    NOT NULL DEFAULT 0,
    stock       INTEGER NOT NULL DEFAULT 0,
    image       TEXT    NOT NULL DEFAULT '',
    sku         TEXT    NOT NULL DEFAULT '',
    barcode     TEXT,
    status      TEXT    NOT NULL DEFAULT 'in-stock',
    lastUpdated TEXT    NOT NULL,
    syncedAt    TEXT
  );

  -- Outbound sync queue
  CREATE TABLE IF NOT EXISTS sync_queue (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name  TEXT    NOT NULL,
    record_id   INTEGER NOT NULL,
    operation   TEXT    NOT NULL,
    payload     TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'pending',
    attempts    INTEGER NOT NULL DEFAULT 0,
    createdAt   TEXT    NOT NULL,
    lastTried   TEXT,
    error       TEXT
  );

  -- App-level key-value store
  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Offline barcode cache
  CREATE TABLE IF NOT EXISTS barcode_cache (
    barcode     TEXT PRIMARY KEY,
    name        TEXT NOT NULL DEFAULT '',
    brand       TEXT NOT NULL DEFAULT '',
    category    TEXT NOT NULL DEFAULT '',
    image       TEXT NOT NULL DEFAULT '',
    cachedAt    TEXT NOT NULL
  );

  -- ── Customers ─────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS customers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    phone       TEXT    NOT NULL DEFAULT '',
    email       TEXT    NOT NULL DEFAULT '',
    address     TEXT    NOT NULL DEFAULT '',
    gst_number  TEXT    NOT NULL DEFAULT '',
    qr_token    TEXT    UNIQUE,
    loyalty_pts INTEGER NOT NULL DEFAULT 0,
    createdAt   TEXT    NOT NULL,
    updatedAt   TEXT    NOT NULL,
    syncedAt    TEXT
  );

  -- ── Bills / Sales ─────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS bills (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_number   TEXT    NOT NULL UNIQUE,
    customer_id   INTEGER REFERENCES customers(id),
    customer_name TEXT    NOT NULL DEFAULT '',
    customer_phone TEXT   NOT NULL DEFAULT '',
    subtotal      REAL    NOT NULL DEFAULT 0,
    discount      REAL    NOT NULL DEFAULT 0,
    tax_rate      REAL    NOT NULL DEFAULT 18,
    tax_amount    REAL    NOT NULL DEFAULT 0,
    total         REAL    NOT NULL DEFAULT 0,
    payment_mode  TEXT    NOT NULL DEFAULT 'cash',
    status        TEXT    NOT NULL DEFAULT 'paid',
    notes         TEXT    NOT NULL DEFAULT '',
    createdAt     TEXT    NOT NULL,
    syncedAt      TEXT
  );

  -- ── Bill line items ───────────────────────────────────────
  CREATE TABLE IF NOT EXISTS bill_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id      INTEGER NOT NULL REFERENCES bills(id),
    inventory_id INTEGER REFERENCES inventory(id),
    name         TEXT    NOT NULL,
    sku          TEXT    NOT NULL DEFAULT '',
    quantity     INTEGER NOT NULL DEFAULT 1,
    unit_price   REAL    NOT NULL DEFAULT 0,
    total_price  REAL    NOT NULL DEFAULT 0
  );

  -- ── Notifications ─────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS notifications (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT    NOT NULL DEFAULT 'client',
    title       TEXT    NOT NULL,
    body        TEXT    NOT NULL,
    bill_id     INTEGER REFERENCES bills(id),
    is_read     INTEGER NOT NULL DEFAULT 0,
    priority    TEXT    NOT NULL DEFAULT 'normal',
    createdAt   TEXT    NOT NULL
  );
`;

export const SEED_META = `
  INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}');
  INSERT OR IGNORE INTO meta (key, value) VALUES ('last_sync_at',   '');
  INSERT OR IGNORE INTO meta (key, value) VALUES ('bill_counter',   '1000');
  INSERT OR IGNORE INTO meta (key, value) VALUES ('shop_name',      'My Shop');
  INSERT OR IGNORE INTO meta (key, value) VALUES ('shop_gst',       '');
  INSERT OR IGNORE INTO meta (key, value) VALUES ('shop_address',   '');
  INSERT OR IGNORE INTO meta (key, value) VALUES ('tax_rate',       '18');
`;
