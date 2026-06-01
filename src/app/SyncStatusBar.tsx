// src/app/SyncStatusBar.tsx
//
// Persistent top bar that shows live network + sync status.
// Pulls state from the local SQLite sync_queue (via useSyncStatus)
// and from the auth session (online/offline badge).

import { useEffect, useState, useCallback } from "react";
import { query } from "../database";
import { syncEngine, syncEvents } from "../sync/sync.engine.client";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

interface SyncSummary {
  pending:  number;
  syncing:  number;
  failed:   number;
  lastSync: string | null;
}

async function fetchSummary(): Promise<SyncSummary> {
  const lastSyncRows = await query<{ value: string }>(
    "SELECT value FROM meta WHERE key = 'last_sync_at'"
  );
  // Count unsynced bills and customers as "pending"
  const [unsyncedBills] = await query<{ n: number }>(
    "SELECT COUNT(*) AS n FROM bills WHERE syncedAt IS NULL"
  );
  const [unsyncedCust] = await query<{ n: number }>(
    "SELECT COUNT(*) AS n FROM customers WHERE syncedAt IS NULL"
  );

  const pending = (unsyncedBills?.n ?? 0) + (unsyncedCust?.n ?? 0);
  return {
    pending,
    syncing:  0,
    failed:   0,
    lastSync: lastSyncRows[0]?.value ?? null,
  };
}

export function SyncStatusBar() {
  const { isOnline } = useNetworkStatus();
  const [summary,    setSummary]    = useState<SyncSummary>({ pending: 0, syncing: 0, failed: 0, lastSync: null });
  const [isSyncing,  setIsSyncing]  = useState(false);

  const refresh = useCallback(async () => {
    try { setSummary(await fetchSummary()); } catch { /* db not ready */ }
  }, []);

  useEffect(() => {
    void refresh();
    syncEvents.on("change", refresh);
    return () => syncEvents.off("change", refresh);
  }, [refresh]);

  async function handleSyncNow() {
    setIsSyncing(true);
    try { await syncEngine.sync(); } finally { setIsSyncing(false); }
  }

  // Don't render if online with nothing pending and synced recently
  const isClean = isOnline && summary.pending === 0;
  if (isClean && summary.lastSync) return null;

  const pill = (() => {
    if (!isOnline)         return { bg: "rgba(239,68,68,.12)",  border: "rgba(239,68,68,.25)",  color: "#b91c1c", label: "🔴 Offline" };
    if (isSyncing)         return { bg: "rgba(59,130,246,.10)", border: "rgba(59,130,246,.25)", color: "#1d4ed8", label: "⟳ Syncing…" };
    if (summary.pending)   return { bg: "rgba(180,83,9,.10)",   border: "rgba(180,83,9,.25)",   color: "#b45309", label: `⬆ ${summary.pending} unsynced` };
    return null;
  })();

  if (!pill) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
      background: pill.bg, borderBottom: `1px solid ${pill.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "5px 16px", backdropFilter: "blur(10px)",
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: pill.color }}>{pill.label}</span>
      {isOnline && summary.pending > 0 && !isSyncing && (
        <button
          onClick={() => void handleSyncNow()}
          style={{
            fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
            background: pill.color, color: "#fff", border: "none", cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Sync now
        </button>
      )}
      {summary.lastSync && (
        <span style={{ fontSize: 10, color: pill.color, opacity: 0.7 }}>
          Last: {new Date(summary.lastSync).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
