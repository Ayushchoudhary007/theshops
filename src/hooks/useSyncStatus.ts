// src/hooks/useSyncStatus.ts
//
// Polls unsynced bills + customers (the v4 sync model).
// sync_queue table is not used in v4 — direct push via syncEngine.

import { useEffect, useState, useCallback } from "react";
import { query } from "../database";
import type { SyncSummary } from "../sync/offline.types";
import { syncEvents } from "../sync/sync.engine.client";

const EMPTY: SyncSummary = {
  pending: 0, syncing: 0, failed: 0, conflict: 0, total: 0, lastSync: null,
};

async function fetchSummary(): Promise<SyncSummary> {
  const lastSyncRows = await query<{ value: string }>(
    "SELECT value FROM meta WHERE key = 'last_sync_at'"
  );

  const [unsyncedBills] = await query<{ n: number }>(
    "SELECT COUNT(*) AS n FROM bills WHERE syncedAt IS NULL"
  ).catch(() => [{ n: 0 }]);

  const [unsyncedCust] = await query<{ n: number }>(
    "SELECT COUNT(*) AS n FROM customers WHERE syncedAt IS NULL"
  ).catch(() => [{ n: 0 }]);

  const pending = (unsyncedBills?.n ?? 0) + (unsyncedCust?.n ?? 0);

  return {
    pending,
    syncing:  0,
    failed:   0,
    conflict: 0,
    total:    pending,
    lastSync: lastSyncRows[0]?.value ?? null,
  };
}

export function useSyncStatus(): SyncSummary {
  const [summary, setSummary] = useState<SyncSummary>(EMPTY);

  const refresh = useCallback(async () => {
    try { setSummary(await fetchSummary()); }
    catch { /* DB not ready */ }
  }, []);

  useEffect(() => {
    refresh();
    syncEvents.on("change", refresh);
    return () => syncEvents.off("change", refresh);
  }, [refresh]);

  return summary;
}
