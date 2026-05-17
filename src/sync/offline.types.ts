// ─────────────────────────────────────────────────────────────
// src/sync/offline.types.ts
//
// All types that describe the offline-first system.
// ─────────────────────────────────────────────────────────────

// ── Network ──────────────────────────────────────────────────

export type NetworkStatus = "online" | "offline" | "checking";

export interface NetworkState {
  status: NetworkStatus;
  isOnline: boolean;
  since: Date | null;       // when we last changed status
  ping: number | null;      // ms — null if offline/untested
}

// ── Sync queue ───────────────────────────────────────────────

export type SyncOperation = "insert" | "update" | "delete";

export type SyncStatus =
  | "pending"    // in queue, not yet sent
  | "syncing"    // currently being pushed
  | "synced"     // acknowledged by server
  | "failed"     // permanently failed (MAX_RETRIES exceeded)
  | "conflict";  // server returned 409, awaiting resolution

export interface SyncQueueRow {
  id:         number;
  table_name: string;
  record_id:  number;
  operation:  SyncOperation;
  payload:    string;         // JSON
  status:     SyncStatus;
  attempts:   number;
  createdAt:  string;         // ISO
  lastTried:  string | null;  // ISO
  error:      string | null;
}

export interface SyncSummary {
  pending:  number;
  syncing:  number;
  failed:   number;
  conflict: number;
  total:    number;
  lastSync: string | null;  // ISO
}

// ── Feature capabilities ─────────────────────────────────────
//
// Every feature declares whether it is ALWAYS available,
// ONLINE-only, or ENHANCED when online (works offline, but
// better with connection).
//
export type FeatureAvailability =
  | "always"    // fully offline — works with no network ever
  | "online"    // requires active connection to function at all
  | "enhanced"; // works offline with reduced functionality; better online

export interface FeatureCapability {
  id:           string;
  label:        string;
  availability: FeatureAvailability;
  /** shown in UI when offline and availability !== 'always' */
  offlineNote?: string;
  /** shown in UI when online and availability === 'enhanced' */
  onlineNote?:  string;
}

// ── Conflict ─────────────────────────────────────────────────

export interface ConflictRecord {
  local:  Record<string, unknown>;
  remote: Record<string, unknown>;
}
