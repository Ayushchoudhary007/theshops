// ─────────────────────────────────────────────────────────────
// src/sync/network.listener.ts
//
// Bridges network state changes → syncEngine.sync().
// Also starts the network monitor singleton.
// ─────────────────────────────────────────────────────────────

import { syncEngine } from "./sync.engine.client";

// Import the monitor's start fn (it's idempotent)
// We do this here so the network monitor starts as soon as the
// listener starts, even before any hook is mounted.
let listenerStarted = false;

export class NetworkListener {
  start(): void {
    if (listenerStarted) return;
    listenerStarted = true;

    // Browser
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);

    // If already online, kick off an initial sync
    if (navigator.onLine) {
      syncEngine.sync().catch(console.error);
    }

    // Capacitor native
    this.attachNative().catch(() => { /* Not in Capacitor */ });
  }

  stop(): void {
    window.removeEventListener("online",  this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    listenerStarted = false;
  }

  private handleOnline = () => {
    console.log("[Network] 🟢 Online — syncing");
    syncEngine.sync().catch(console.error);
  };

  private handleOffline = () => {
    console.log("[Network] 🔴 Offline — all writes queue locally");
  };

  private async attachNative(): Promise<void> {
    const { Network } = await import("@capacitor/network");
    await Network.addListener("networkStatusChange", (s) => {
      if (s.connected) {
        console.log("[Network] Native 🟢 — syncing");
        syncEngine.sync().catch(console.error);
      } else {
        console.log("[Network] Native 🔴 — offline mode");
      }
    });
  }
}

export const networkListener = new NetworkListener();
