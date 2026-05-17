// ─────────────────────────────────────────────────────────────
// src/hooks/useFeature.ts
//
// Combines feature capability + current network state into a
// single answer: can the user use this feature right now?
// ─────────────────────────────────────────────────────────────

import { useNetworkStatus } from "./useNetworkStatus";
import { FEATURES, type FeatureKey } from "../services/features";
import type { FeatureAvailability } from "../sync/offline.types";

export interface FeatureState {
  available:    boolean;
  availability: FeatureAvailability;
  /** UI message to show when not fully available */
  note:         string | null;
}

export function useFeature(key: FeatureKey): FeatureState {
  const { isOnline } = useNetworkStatus();
  const feature = FEATURES[key];

  if (feature.availability === "always") {
    return { available: true, availability: "always", note: null };
  }

  if (feature.availability === "online") {
    return {
      available:    isOnline,
      availability: "online",
      note:         isOnline ? null : (feature.offlineNote ?? "Requires internet connection."),
    };
  }

  // "enhanced" — always available but note changes
  return {
    available:    true,
    availability: "enhanced",
    note:         isOnline
      ? (feature.onlineNote ?? null)
      : (feature.offlineNote ?? null),
  };
}

// ── Convenience: check multiple features at once ─────────────
export function useFeatures<T extends FeatureKey>(
  keys: T[]
): Record<T, FeatureState> {
  const { isOnline } = useNetworkStatus();

  return Object.fromEntries(
    keys.map((key) => {
      const feature = FEATURES[key];

      if (feature.availability === "always") {
        return [key, { available: true, availability: "always", note: null }];
      }
      if (feature.availability === "online") {
        return [key, {
          available:    isOnline,
          availability: "online",
          note: isOnline ? null : (feature.offlineNote ?? null),
        }];
      }
      return [key, {
        available:    true,
        availability: "enhanced",
        note: isOnline ? (feature.onlineNote ?? null) : (feature.offlineNote ?? null),
      }];
    })
  ) as Record<T, FeatureState>;
}
