// ─────────────────────────────────────────────────────────────
// src/sync/conflict.resolver.ts
//
// Called when the server returns HTTP 409 during a sync push.
//
// Strategy:
//   • Most fields:  last-write-wins (higher lastUpdated wins)
//   • stock field:  additive delta merge
//     → If device A sold 3 units while offline AND device B
//       sold 2 units while offline, merged result is -5 total,
//       not just the last writer's -2 or -3.
// ─────────────────────────────────────────────────────────────

import type { ConflictRecord } from "./offline.types";

type InventoryStatus = "in-stock" | "low-stock" | "out-of-stock";

function calcStatus(stock: number): InventoryStatus {
  if (stock === 0) return "out-of-stock";
  if (stock < 10)  return "low-stock";
  return "in-stock";
}

export function resolveConflict(conflict: ConflictRecord): Record<string, unknown> {
  const { local, remote } = conflict;

  const localTs  = new Date(local.lastUpdated  as string).getTime();
  const remoteTs = new Date(remote.lastUpdated as string).getTime();

  const [winner, loser] = remoteTs >= localTs
    ? [remote, local]
    : [local,  remote];

  // Additive stock delta:
  //   loser's "base" stock before its edit = the remote's known stock
  //   delta  = what the loser changed
  //   merged = winner's stock + delta
  const loserBase  = remote.stock as number;   // last server-known value
  const loserDelta = (loser.stock  as number) - loserBase;
  const mergedStock = Math.max(0, (winner.stock as number) + loserDelta);

  return {
    ...winner,
    stock:       mergedStock,
    status:      calcStatus(mergedStock),
    lastUpdated: new Date().toISOString(),
    syncedAt:    null,   // will be set after successful re-push
  };
}
