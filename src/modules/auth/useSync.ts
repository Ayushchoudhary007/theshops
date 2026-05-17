// ─────────────────────────────────────────────────────────────
// src/modules/auth/useSync.ts
//
// Reactive sync state hook.
// Watches network status and fires the sync queue when online.
// Also attempts to upgrade an offline-only session to a live one.
//
// Use in your root layout so sync runs app-wide.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import { SyncService, type SyncRunResult } from "./sync.service";
import { AuthService } from "./auth.service";
import { getNetworkState } from "../../hooks/useNetworkStatus";

export type SyncState =
  | "idle"      // nothing pending
  | "pending"   // items in queue, waiting for network
  | "running"   // sync in progress
  | "done"      // last run completed (success)
  | "partial"   // last run had some failures
  | "error";    // last run completely failed / still offline

export interface UseSyncReturn {
  syncState:    SyncState;
  pendingCount: number;
  lastResult:   SyncRunResult | null;
  lastSyncAt:   string | null;    // ISO
  /** Manually trigger a sync attempt */
  triggerSync:  () => Promise<void>;
}

export function useSync(): UseSyncReturn {
  const [syncState,    setSyncState]    = useState<SyncState>("idle");
  const [pendingCount, setPendingCount] = useState(() => SyncService.getPendingCount());
  const [lastResult,   setLastResult]   = useState<SyncRunResult | null>(null);
  const [lastSyncAt,   setLastSyncAt]   = useState<string | null>(null);

  const isSyncing  = useRef(false);
  const wasOnline  = useRef(false);

  const triggerSync = useCallback(async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    // 1. Try to upgrade an offline-only session to a live one
    await AuthService.tryUpgradeSession();

    // 2. Try to complete any pending owner registration
    await AuthService.tryCompleteRegistration();

    // 3. Process the sync queue
    const count = SyncService.getPendingCount();
    if (count === 0) {
      setSyncState("idle");
      isSyncing.current = false;
      return;
    }

    setSyncState("running");
    try {
      const result = await SyncService.runQueue();
      setLastResult(result);
      setLastSyncAt(new Date().toISOString());
      setPendingCount(SyncService.getPendingCount());

      if (result.failed === 0 && result.skipped === 0) {
        setSyncState("done");
      } else if (result.succeeded > 0) {
        setSyncState("partial");
      } else {
        setSyncState("error");
      }
    } catch {
      setSyncState("error");
    } finally {
      isSyncing.current = false;
    }
  }, []);

  // Poll network — auto-sync when we come back online
  useEffect(() => {
    const CHECK_MS = 5_000;
    const interval = setInterval(() => {
      const { isOnline } = getNetworkState();

      // Became online
      if (isOnline && !wasOnline.current) {
        wasOnline.current = true;
        triggerSync();
      }

      // Went offline
      if (!isOnline) {
        wasOnline.current = false;
        const count = SyncService.getPendingCount();
        setPendingCount(count);
        if (count > 0) setSyncState("pending");
      }
    }, CHECK_MS);

    // Initial count on mount
    setPendingCount(SyncService.getPendingCount());

    return () => clearInterval(interval);
  }, [triggerSync]);

  return { syncState, pendingCount, lastResult, lastSyncAt, triggerSync };
}
