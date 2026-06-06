// ─────────────────────────────────────────────────────────────
// src/hooks/useNetworkStatus.ts
//
// Reactive hook — any component can subscribe to the live
// network state without prop drilling.
//
// Sources of truth (in priority order):
//   1. Capacitor Network plugin   (native iOS/Android)
//   2. navigator.onLine + events  (browser)
//   3. /ping health-check         (confirms connectivity beyond LAN)
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useRef } from "react";
import type { NetworkState} from "../sync/offline.types";

const PING_URL     = `${import.meta.env.VITE_API_URL ?? "https://api.theshop.app"}/api/ping`;
const PING_TIMEOUT = 20_000; // ms — Railway free tier needs ~15s to wake from sleep
const PING_INTERVAL_ONLINE  = 30_000; // re-check every 30s while connected
const PING_INTERVAL_OFFLINE = 15_000; // re-check every 15s while disconnected (faster recovery)

// ── Module-level subscribers (shared across hook instances) ──
type Listener = (state: NetworkState) => void;
const listeners = new Set<Listener>();
let currentState: NetworkState = {
  status: "checking",
  isOnline: false,
  since: null,
  ping: null,
};

function broadcast(next: NetworkState) {
  currentState = next;
  listeners.forEach((fn) => fn(next));
}

// ── Ping helper ──────────────────────────────────────────────
async function pingServer(): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT);
    const t0 = performance.now();
    const res = await fetch(PING_URL, {
      method: "GET",
      cache:  "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok ? Math.round(performance.now() - t0) : null;
  } catch {
    return null;
  }
}

async function checkAndBroadcast(): Promise<void> {
  // Fast path: browser says offline → trust it immediately
  if (!navigator.onLine) {
    broadcast({
      status:   "offline",
      isOnline: false,
      since:    currentState.isOnline ? new Date() : currentState.since,
      ping:     null,
    });
    return;
  }

  // Verify with a real ping (catches captive portals, LAN-only, etc.)
  // Broadcast "checking" so UI shows spinner rather than "unreachable"
  if (currentState.status !== "online") {
    broadcast({ ...currentState, status: "checking" });
  }

  let ping = await pingServer();

  // Railway free tier can take up to 15s to wake from sleep.
  // If the first ping times out but browser is online, retry once.
  if (ping === null && navigator.onLine) {
    await new Promise(r => setTimeout(r, 5_000)); // wait 5s for server to wake
    ping = await pingServer();
  }

  const isOnline = ping !== null;
  const prevOnline = currentState.isOnline;

  broadcast({
    status:   isOnline ? "online" : "offline",
    isOnline,
    since:    isOnline !== prevOnline ? new Date() : currentState.since,
    ping:     isOnline ? ping : null,
  });
}

// ── Singleton initialiser (runs once per app) ────────────────
let started = false;
let pingTimer: ReturnType<typeof setInterval> | null = null;

async function startNetworkMonitor() {
  if (started) return;
  started = true;

  // Initial check
  broadcast({ ...currentState, status: "checking" });
  await checkAndBroadcast();

  // Browser events
  window.addEventListener("online",  () => checkAndBroadcast());
  window.addEventListener("offline", () => checkAndBroadcast());

  // Periodic re-ping — faster when offline so we recover quickly from Railway sleep
  function schedulePing() {
    if (pingTimer) clearInterval(pingTimer);
    const interval = currentState.isOnline ? PING_INTERVAL_ONLINE : PING_INTERVAL_OFFLINE;
    pingTimer = setInterval(async () => {
      await checkAndBroadcast();
      schedulePing(); // reschedule with updated interval based on new state
    }, interval);
  }
  schedulePing();

  // Capacitor native (no-op if not in Capacitor context)
  try {
    const { Network } = await import("@capacitor/network");
    await Network.addListener("networkStatusChange", (s) => {
      if (!s.connected) {
        broadcast({
          status: "offline", isOnline: false,
          since: new Date(), ping: null,
        });
      } else {
        checkAndBroadcast();
      }
    });
    // Sync initial native state
    const { connected } = await Network.getStatus();
    if (!connected) {
      broadcast({ status: "offline", isOnline: false, since: new Date(), ping: null });
    }
  } catch {
    /* not in Capacitor — ignore */
  }
}

// ── React hook ───────────────────────────────────────────────

export function useNetworkStatus(): NetworkState {
  const [state, setState] = useState<NetworkState>(currentState);
  const mounted = useRef(true);

  const listener = useCallback((next: NetworkState) => {
    if (mounted.current) setState(next);
  }, []);

  useEffect(() => {
    mounted.current = true;
    listeners.add(listener);
    startNetworkMonitor(); // idempotent
    setState(currentState);

    return () => {
      mounted.current = false;
      listeners.delete(listener);
    };
  }, [listener]);

  return state;
}

// ── Plain getter (for non-React code, e.g. sync engine) ──────
export function getNetworkState(): NetworkState {
  return currentState;
}

export function stopNetworkMonitor() {
  if (pingTimer) {
    clearInterval(pingTimer);  // ← now pingTimer is "read"
    pingTimer = null;
  }
  started = false;
}