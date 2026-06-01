// src/modules/customers/customers.service.ts

import { query, run } from "../../database";
import type { Customer, CustomerDraft, CustomerRow } from "./customers.types";

function now() {
  return new Date().toISOString();
}

/** Generate a short unique QR token */
function makeQrToken(name: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, "-").slice(0, 12);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${slug}-${rand}`;
}

export const CustomerService = {
  async list(): Promise<CustomerRow[]> {
    return query<CustomerRow>(`
      SELECT
        c.*,
        COUNT(b.id)       AS total_bills,
        COALESCE(SUM(b.total), 0) AS total_spent
      FROM customers c
      LEFT JOIN bills b ON b.customer_id = c.id AND b.status != 'cancelled'
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
  },

  async get(id: number): Promise<Customer | null> {
    const rows = await query<Customer>(
      "SELECT * FROM customers WHERE id = ?",
      [id]
    );
    return rows[0] ?? null;
  },

  async findByPhone(phone: string): Promise<Customer | null> {
    const rows = await query<Customer>(
      "SELECT * FROM customers WHERE phone = ?",
      [phone]
    );
    return rows[0] ?? null;
  },

  async findByQrToken(token: string): Promise<Customer | null> {
    const rows = await query<Customer>(
      "SELECT * FROM customers WHERE qr_token = ?",
      [token]
    );
    return rows[0] ?? null;
  },

  async add(draft: CustomerDraft): Promise<number> {
    const token = draft.qr_token ?? makeQrToken(draft.name);
    const ts = now();
    await run(
      `INSERT INTO customers (name, phone, email, address, gst_number, qr_token, loyalty_pts, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [draft.name, draft.phone, draft.email, draft.address, draft.gst_number, token, ts, ts]
    );
    const rows = await query<{ id: number }>(
      "SELECT last_insert_rowid() AS id"
    );
    return rows[0]?.id ?? 0;
  },

  async update(id: number, patch: Partial<CustomerDraft>): Promise<void> {
    // Whitelist allowed columns to prevent SQL injection via key names
    const ALLOWED = ["name", "phone", "email", "address", "gst_number", "qr_token"];
    const entries = Object.entries(patch).filter(([k]) => ALLOWED.includes(k));
    if (!entries.length) return;
    const fields = entries.map(([k]) => `${k} = ?`).join(", ");
    const values = entries.map(([, v]) => v);
    await run(
      `UPDATE customers SET ${fields}, updatedAt = ? WHERE id = ?`,
      [...values, now(), id]
    );
  },

  async delete(id: number): Promise<void> {
    await run("DELETE FROM customers WHERE id = ?", [id]);
  },

  async addLoyaltyPoints(id: number, pts: number): Promise<void> {
    await run(
      "UPDATE customers SET loyalty_pts = loyalty_pts + ?, updatedAt = ? WHERE id = ?",
      [pts, now(), id]
    );
  },

  /** Parse a QR code payload — supports JSON {"name":…,"phone":…} or plain phone */
  parseQrPayload(raw: string): { name: string; phone: string } | null {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.name || parsed.phone) {
        return { name: parsed.name ?? "", phone: parsed.phone ?? "" };
      }
    } catch {
      // not JSON — treat as plain phone number
      if (/^\+?\d{7,15}$/.test(raw.trim())) {
        return { name: "", phone: raw.trim() };
      }
    }
    return null;
  },
};
