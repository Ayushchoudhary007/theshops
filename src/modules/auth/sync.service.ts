// ─────────────────────────────────────────────────────────────
// src/modules/auth/sync.service.ts
//
// Processes the SyncQueue when the device comes back online.
// Runs pending operations in order, marks each done/failed,
// and updates the corresponding LocalSubAccount sync status.
//
// Called by useSync hook on network restoration.
// ─────────────────────────────────────────────────────────────

import type { SyncQueueItem } from "./auth.types";
import { AuthService } from "./auth.service";
import { SyncQueueStore, SubAccountStore } from "./auth.storage";

const MAX_ATTEMPTS = 5;

const SERVER_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

async function api<T>(
  path:   string,
  body?:  object,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = body ? "POST" : "GET",
): Promise<T> {
  const token = AuthService.getToken();
  if (!token || token === "offline") throw new Error("OFFLINE");
  const res = await fetch(`${SERVER_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

async function processItem(item: SyncQueueItem): Promise<void> {
  SyncQueueStore.updateItem(item.id, { status: "syncing" });
  if (item.localId) SubAccountStore.updateSyncStatus(item.localId, "syncing");

  try {
    switch (item.type) {

      case "register_owner": {
        SyncQueueStore.markDone(item.id);
        return;
      }

      case "create_manager": {
        const r = await api<{ id: string }>("/api/sub-accounts/managers", item.payload);
        if (item.localId) SubAccountStore.updateSyncStatus(item.localId, "synced", r.id);
        SyncQueueStore.markDone(item.id);
        break;
      }

      case "create_staff": {
        const r = await api<{ id: string }>("/api/sub-accounts/staff", item.payload);
        if (item.localId) SubAccountStore.updateSyncStatus(item.localId, "synced", r.id);
        SyncQueueStore.markDone(item.id);
        break;
      }

      case "update_permissions": {
        const { targetRole, permissions } = item.payload as {
          targetRole: "manager" | "staff"; permissions: string[];
        };
        const local    = item.localId ? SubAccountStore.getByLocalId(item.localId) : null;
        const targetId = local?.serverId ?? item.localId;
        const endpoint = targetRole === "manager"
          ? `/api/sub-accounts/managers/${targetId}/permissions`
          : `/api/sub-accounts/staff/${targetId}/permissions`;
        await api<void>(endpoint, { permissions }, "PUT");
        if (item.localId) SubAccountStore.updateSyncStatus(item.localId, "synced", local?.serverId);
        SyncQueueStore.markDone(item.id);
        break;
      }

      case "deactivate_account": {
        const { role } = item.payload as { role: "manager" | "staff" };
        const local    = item.localId ? SubAccountStore.getByLocalId(item.localId) : null;
        const targetId = local?.serverId ?? item.localId;
        const ep       = role === "manager"
          ? `/api/sub-accounts/managers/${targetId}/deactivate`
          : `/api/sub-accounts/staff/${targetId}/deactivate`;
        await api<void>(ep, {}, "POST");
        if (item.localId) SubAccountStore.updateSyncStatus(item.localId, "synced", local?.serverId);
        SyncQueueStore.markDone(item.id);
        break;
      }

      case "reactivate_account": {
        const { role } = item.payload as { role: "manager" | "staff" };
        const local    = item.localId ? SubAccountStore.getByLocalId(item.localId) : null;
        const targetId = local?.serverId ?? item.localId;
        const ep       = role === "manager"
          ? `/api/sub-accounts/managers/${targetId}/reactivate`
          : `/api/sub-accounts/staff/${targetId}/reactivate`;
        await api<void>(ep, {}, "POST");
        if (item.localId) SubAccountStore.updateSyncStatus(item.localId, "synced", local?.serverId);
        SyncQueueStore.markDone(item.id);
        break;
      }

      case "reset_password": {
        const { targetRole, newPassword } = item.payload as {
          targetRole: "manager" | "staff"; newPassword: string;
        };
        const local    = item.localId ? SubAccountStore.getByLocalId(item.localId) : null;
        const targetId = local?.serverId ?? item.localId;
        const ep       = targetRole === "manager"
          ? `/api/sub-accounts/managers/${targetId}/reset-password`
          : `/api/sub-accounts/staff/${targetId}/reset-password`;
        await api<void>(ep, { newPassword }, "POST");
        if (item.localId) SubAccountStore.updateSyncStatus(item.localId, "synced", local?.serverId);
        SyncQueueStore.markDone(item.id);
        break;
      }

      default:
        SyncQueueStore.markDone(item.id);
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    SyncQueueStore.markFailed(item.id, error);
    if (item.localId) SubAccountStore.updateSyncStatus(item.localId, "failed", undefined, error);
    throw err;
  }
}

export type SyncRunResult = {
  processed: number;
  succeeded: number;
  failed:    number;
  skipped:   number;
};

export const SyncService = {

  async runQueue(): Promise<SyncRunResult> {
    const pending = SyncQueueStore.getPending();
    const result: SyncRunResult = { processed: 0, succeeded: 0, failed: 0, skipped: 0 };

    for (const item of pending) {
      if (item.attempts >= MAX_ATTEMPTS) { result.skipped++; continue; }
      result.processed++;
      try {
        await processItem(item);
        result.succeeded++;
      } catch (err) {
        result.failed++;
        if ((err as Error).message === "OFFLINE") break;
      }
    }

    SyncQueueStore.pruneCompleted();
    return result;
  },

  getPendingCount(): number {
    return SyncQueueStore.getPending().length;
  },

  getQueue() {
    return SyncQueueStore.getAll();
  },

  pruneCompleted() {
    SyncQueueStore.pruneCompleted();
  },
};
