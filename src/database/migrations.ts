// src/database/migrations.ts

import { query, run } from "./index";

interface Migration {
  version: number;
  up: string[];
}

const MIGRATIONS: Migration[] = [
  { version: 1, up: [] }, // baseline — handled by schema.ts CREATE_TABLES
  { version: 2, up: [] }, // reserved
  {
    version: 3,
    up: [
      // Add tables for existing DBs upgrading from v1/v2
      `CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        gst_number TEXT NOT NULL DEFAULT '',
        qr_token TEXT UNIQUE,
        loyalty_pts INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncedAt TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_number TEXT NOT NULL UNIQUE,
        customer_id INTEGER REFERENCES customers(id),
        customer_name TEXT NOT NULL DEFAULT '',
        customer_phone TEXT NOT NULL DEFAULT '',
        subtotal REAL NOT NULL DEFAULT 0,
        discount REAL NOT NULL DEFAULT 0,
        tax_rate REAL NOT NULL DEFAULT 18,
        tax_amount REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0,
        payment_mode TEXT NOT NULL DEFAULT 'cash',
        status TEXT NOT NULL DEFAULT 'paid',
        notes TEXT NOT NULL DEFAULT '',
        createdAt TEXT NOT NULL,
        syncedAt TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS bill_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_id INTEGER NOT NULL REFERENCES bills(id),
        inventory_id INTEGER REFERENCES inventory(id),
        name TEXT NOT NULL,
        sku TEXT NOT NULL DEFAULT '',
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price REAL NOT NULL DEFAULT 0,
        total_price REAL NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL DEFAULT 'client',
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        bill_id INTEGER REFERENCES bills(id),
        is_read INTEGER NOT NULL DEFAULT 0,
        priority TEXT NOT NULL DEFAULT 'normal',
        createdAt TEXT NOT NULL
      )`,
      `INSERT OR IGNORE INTO meta (key, value) VALUES ('bill_counter', '1000')`,
      `INSERT OR IGNORE INTO meta (key, value) VALUES ('shop_name',    'My Shop')`,
      `INSERT OR IGNORE INTO meta (key, value) VALUES ('shop_gst',     '')`,
      `INSERT OR IGNORE INTO meta (key, value) VALUES ('shop_address', '')`,
      `INSERT OR IGNORE INTO meta (key, value) VALUES ('tax_rate',     '18')`,
    ],
  },
  {
    version: 4,
    up: [
      // Add UNIQUE(name, sku) to inventory so ON CONFLICT upsert works during sync.
      // SQLite cannot add UNIQUE constraints with ALTER TABLE — must recreate the table.
      `CREATE TABLE IF NOT EXISTS inventory_v4 (
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
        syncedAt    TEXT,
        UNIQUE(name, sku)
      )`,
      `INSERT OR IGNORE INTO inventory_v4
         SELECT id,name,category,brand,price,stock,image,sku,
                barcode,status,lastUpdated,syncedAt
         FROM inventory`,
      `DROP TABLE IF EXISTS inventory`,
      `ALTER TABLE inventory_v4 RENAME TO inventory`,
    ],
  },
];

export async function runMigrations(): Promise<void> {
  const rows = await query<{ value: string }>(
    "SELECT value FROM meta WHERE key = 'schema_version'"
  );
  const currentVersion = rows.length ? parseInt(rows[0].value, 10) : 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue;
    console.log(`[DB] Running migration v${migration.version}`);
    for (const sql of migration.up) {
      await run(sql);
    }
    await run(
      "UPDATE meta SET value = ? WHERE key = 'schema_version'",
      [String(migration.version)]
    );
  }
}
