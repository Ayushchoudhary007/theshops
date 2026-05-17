// src/modules/notifications/notifications.service.ts

import { query, run } from "../../database";
import type { Notification, NotifDraft } from "./notifications.types";

function now() {
  return new Date().toISOString();
}

export const NotificationService = {
  async list(filter?: {
    type?: string;
    unreadOnly?: boolean;
  }): Promise<Notification[]> {
    let sql =
      "SELECT n.*, b.bill_number FROM notifications n LEFT JOIN bills b ON b.id = n.bill_id WHERE 1=1";
    const params: unknown[] = [];

    if (filter?.type && filter.type !== "all") {
      sql += " AND n.type = ?";
      params.push(filter.type);
    }
    if (filter?.unreadOnly) {
      sql += " AND n.is_read = 0";
    }

    sql += " ORDER BY n.createdAt DESC LIMIT 200";
    return query<Notification>(sql, params);
  },

  async unreadCount(): Promise<number> {
    const rows = await query<{ n: number }>(
      "SELECT COUNT(*) AS n FROM notifications WHERE is_read = 0"
    );
    return rows[0]?.n ?? 0;
  },

  async create(draft: NotifDraft): Promise<number> {
    await run(
      `INSERT INTO notifications (type, title, body, bill_id, is_read, priority, createdAt)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [
        draft.type,
        draft.title,
        draft.body,
        draft.bill_id ?? null,
        draft.priority,
        now(),
      ]
    );
    const rows = await query<{ id: number }>(
      "SELECT last_insert_rowid() AS id"
    );
    return rows[0]?.id ?? 0;
  },

  async markRead(id: number): Promise<void> {
    await run("UPDATE notifications SET is_read = 1 WHERE id = ?", [id]);
  },

  async markAllRead(): Promise<void> {
    await run("UPDATE notifications SET is_read = 1");
  },

  async delete(id: number): Promise<void> {
    await run("DELETE FROM notifications WHERE id = ?", [id]);
  },

  async clearAll(): Promise<void> {
    await run("DELETE FROM notifications");
  },

  /** Called by SyncEngine / server push simulator */
  async createServerMessage(title: string, body: string, priority: "low" | "normal" | "high" = "normal"): Promise<void> {
    await NotificationService.create({ type: "server", title, body, bill_id: null, priority });
  },

  async createClientMessage(title: string, body: string): Promise<void> {
    await NotificationService.create({ type: "client", title, body, bill_id: null, priority: "normal" });
  },

  async createAlert(title: string, body: string): Promise<void> {
    await NotificationService.create({ type: "alert", title, body, bill_id: null, priority: "high" });
  },
};
