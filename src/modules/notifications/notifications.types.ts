// src/modules/notifications/notifications.types.ts

export type NotifType = "server" | "client" | "bill" | "alert";
export type NotifPriority = "low" | "normal" | "high";

export interface Notification {
  id: number;
  type: NotifType;
  title: string;
  body: string;
  bill_id: number | null;
  is_read: number; // 0 | 1
  priority: NotifPriority;
  createdAt: string;
}

export type NotifDraft = Omit<Notification, "id" | "is_read" | "createdAt">;

export const NOTIF_META: Record<
  NotifType,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  server: {
    label: "Server",
    color: "#185FA5",
    bgColor: "rgba(24,95,165,0.10)",
    icon: "🖥️",
  },
  client: {
    label: "Client",
    color: "#3B6D11",
    bgColor: "rgba(59,109,17,0.10)",
    icon: "👤",
  },
  bill: {
    label: "Bill",
    color: "#854F0B",
    bgColor: "rgba(133,79,11,0.10)",
    icon: "🧾",
  },
  alert: {
    label: "Alert",
    color: "#b91c1c",
    bgColor: "rgba(185,28,28,0.10)",
    icon: "🔔",
  },
};
