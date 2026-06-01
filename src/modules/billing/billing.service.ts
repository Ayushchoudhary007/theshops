// src/modules/billing/billing.service.ts

import { query, run } from "../../database";
import type { Bill, BillDraft, BillItem, BillSummary } from "./billing.types";
import { NotificationService } from "../notifications/notifications.service";

function now() {
  return new Date().toISOString();
}

async function nextBillNumber(): Promise<string> {
  const rows = await query<{ value: string }>(
    "SELECT value FROM meta WHERE key = 'bill_counter'"
  );
  const counter = parseInt(rows[0]?.value ?? "1000", 10) + 1;
  // Use INSERT OR REPLACE so it works even if the row doesn't exist yet
  await run(
    "INSERT OR REPLACE INTO meta (key, value) VALUES ('bill_counter', ?)",
    [String(counter)]
  );
  return `BILL-${counter}`;
}

export function computeSummary(
  items: BillItem[],
  discount: number,
  taxRate: number
): BillSummary {
  const subtotal = items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
  const afterDiscount = Math.max(0, subtotal - discount);
  const tax_amount = parseFloat(((afterDiscount * taxRate) / 100).toFixed(2));
  const total = parseFloat((afterDiscount + tax_amount).toFixed(2));
  return { subtotal, discount, tax_rate: taxRate, tax_amount, total };
}

export const BillingService = {
  async list(limit = 100, offset = 0): Promise<Bill[]> {
    return query<Bill>(
      `SELECT * FROM bills ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  },

  async get(id: number): Promise<Bill | null> {
    const rows = await query<Bill>("SELECT * FROM bills WHERE id = ?", [id]);
    if (!rows[0]) return null;
    const bill = rows[0];
    bill.items = await BillingService.getItems(id);
    return bill;
  },

  async getByBillNumber(billNumber: string): Promise<Bill | null> {
    const rows = await query<Bill>(
      "SELECT * FROM bills WHERE bill_number = ?",
      [billNumber]
    );
    if (!rows[0]) return null;
    const bill = rows[0];
    bill.items = await BillingService.getItems(bill.id);
    return bill;
  },

  async getItems(billId: number): Promise<BillItem[]> {
    return query<BillItem>("SELECT * FROM bill_items WHERE bill_id = ?", [
      billId,
    ]);
  },

  async create(draft: BillDraft): Promise<Bill> {
    const bill_number = await nextBillNumber();
    const summary = computeSummary(draft.items, draft.discount, draft.tax_rate);
    const ts = now();

    await run(
      `INSERT INTO bills
         (bill_number, customer_id, customer_name, customer_phone,
          subtotal, discount, tax_rate, tax_amount, total,
          payment_mode, status, notes, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?)`,
      [
        bill_number,
        draft.customer_id ?? null,
        draft.customer_name,
        draft.customer_phone,
        summary.subtotal,
        summary.discount,
        summary.tax_rate,
        summary.tax_amount,
        summary.total,
        draft.payment_mode,
        draft.notes,
        ts,
      ]
    );

    const idRows = await query<{ id: number }>(
      "SELECT last_insert_rowid() AS id"
    );
    const billId = idRows[0]!.id;

    // Insert line items
    for (const item of draft.items) {
      await run(
        `INSERT INTO bill_items
           (bill_id, inventory_id, name, sku, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          billId,
          item.inventory_id ?? null,
          item.name,
          item.sku,
          item.quantity,
          item.unit_price,
          item.quantity * item.unit_price,
        ]
      );

      // Deduct stock from inventory if linked
      if (item.inventory_id) {
        await run(
          `UPDATE inventory
           SET stock = MAX(0, stock - ?), lastUpdated = ?
           WHERE id = ?`,
          [item.quantity, ts, item.inventory_id]
        );
      }
    }

    // Create a bill notification
    await NotificationService.create({
      type: "bill",
      title: `Bill ${bill_number} created`,
      body: `${draft.customer_name || "Walk-in"} · ₹${summary.total.toFixed(2)} · ${draft.payment_mode.toUpperCase()}`,
      bill_id: billId,
      priority: "normal",
    });

    const fullBill = await BillingService.get(billId);
    return fullBill!;
  },

  async cancel(id: number): Promise<void> {
    await run(
      "UPDATE bills SET status = 'cancelled', syncedAt = NULL WHERE id = ?",
      [id]
    );
  },

  // ── Reports helpers ───────────────────────────────────────────────────────

  /**
   * Stats for today (midnight-to-now in local time).
   * Uses substr(createdAt, 1, 10) to match "YYYY-MM-DD" regardless of
   * whether createdAt is stored as a full ISO string or date-only.
   */
  async todayStats(): Promise<{
    count: number;
    revenue: number;
    avgBill: number;
  }> {
    const todayDate = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const rows = await query<{ count: number; revenue: number }>(
      `SELECT
         COUNT(*)                AS count,
         COALESCE(SUM(total), 0) AS revenue
       FROM bills
       WHERE status != 'cancelled'
         AND substr(createdAt, 1, 10) = ?`,
      [todayDate]
    );
    const c = Number(rows[0]?.count ?? 0);
    const r = Number(rows[0]?.revenue ?? 0);
    return { count: c, revenue: r, avgBill: c ? r / c : 0 };
  },

  /**
   * Revenue grouped by calendar date for the last `days` days.
   * Gaps (days with no sales) are filled with zeros so the bar chart
   * in Reports.tsx has no missing bars.
   */
  async dailyRevenue(
    days = 30
  ): Promise<Array<{ date: string; revenue: number; count: number }>> {
    const startDate = (() => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1));
      return d.toISOString().slice(0, 10);
    })();

    const rows = await query<{ date: string; revenue: number; count: number }>(
      `SELECT
         substr(createdAt, 1, 10)    AS date,
         COALESCE(SUM(total), 0)     AS revenue,
         COUNT(*)                    AS count
       FROM bills
       WHERE status != 'cancelled'
         AND substr(createdAt, 1, 10) >= ?
       GROUP BY date
       ORDER BY date ASC`,
      [startDate]
    );

    // Fill gaps: build a lookup then walk every day in the window
    const map = new Map(
      rows.map(r => [
        r.date,
        { date: r.date, revenue: Number(r.revenue), count: Number(r.count) },
      ])
    );

    const filled: Array<{ date: string; revenue: number; count: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      filled.push(map.get(key) ?? { date: key, revenue: 0, count: 0 });
    }
    return filled;
  },

  /**
   * Top-selling products by revenue.
   * Pass `days > 0` to scope to a rolling window (matches the period
   * selector in Reports.tsx). Default 0 = all-time.
   */
  async topProducts(
    limit = 5,
    days = 0
  ): Promise<Array<{ name: string; quantity: number; revenue: number }>> {
    if (days > 0) {
      const startDate = (() => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1));
        return d.toISOString().slice(0, 10);
      })();
      return query(
        `SELECT
           bi.name,
           SUM(bi.quantity)    AS quantity,
           SUM(bi.total_price) AS revenue
         FROM bill_items bi
         JOIN bills b ON b.id = bi.bill_id
         WHERE b.status != 'cancelled'
           AND substr(b.createdAt, 1, 10) >= ?
         GROUP BY bi.name
         ORDER BY revenue DESC
         LIMIT ?`,
        [startDate, limit]
      );
    }
    return query(
      `SELECT
         bi.name,
         SUM(bi.quantity)    AS quantity,
         SUM(bi.total_price) AS revenue
       FROM bill_items bi
       JOIN bills b ON b.id = bi.bill_id
       WHERE b.status != 'cancelled'
       GROUP BY bi.name
       ORDER BY revenue DESC
       LIMIT ?`,
      [limit]
    );
  },

  /**
   * Payment-mode breakdown — non-cancelled bills, all-time.
   */
  async paymentModeBreakdown(): Promise<
    Array<{ payment_mode: string; count: number; total: number }>
  > {
    return query(
      `SELECT
         payment_mode,
         COUNT(*)                AS count,
         COALESCE(SUM(total), 0) AS total
       FROM bills
       WHERE status != 'cancelled'
       GROUP BY payment_mode
       ORDER BY total DESC`
    );
  },
};
