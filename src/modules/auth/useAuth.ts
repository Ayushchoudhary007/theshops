// ─────────────────────────────────────────────────────────────
// src/modules/auth/useAuth.ts
//
// Reactive auth state hook — local-first.
//
// Offline login: if a user has logged in successfully before on
// this device, they can log back in offline. The hook reflects
// the "offline-only" status so the UI can show an indicator.
//
// Session upgrade: when the device comes back online during an
// offline session, the hook automatically tries to get a real
// server token and upgrades to "linked".
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService } from "./auth.service";
import { hasPermission, hasAllPermissions, hasAnyPermission } from "./auth.permissions";
import { getNetworkState } from "../../hooks/useNetworkStatus";
import type { AuthState, Permission } from "./auth.types";

export type SyncResult = "idle" | "syncing" | "success" | "failed";

export interface UseAuthReturn extends AuthState {
  syncResult:     SyncResult;

  // Actions
  reload:         () => void;
  trySync:        () => Promise<void>;   // push pending owner reg to server
  refreshSession: () => Promise<void>;   // re-fetch permissions from server
  logout:         () => Promise<void>;
  logoutAndForget:() => Promise<void>;   // also clears offline credential cache
  discardOffline: () => void;

  // Role shortcuts
  isOwner:   boolean;
  isManager: boolean;
  isStaff:   boolean;

  // Permission helpers
  can:    (permission: Permission) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  canAny: (permissions: Permission[]) => boolean;

  // Shop helpers
  shopIds:        string[];
  activeShopName: string | null;

  // Credential cache info
  lastCachedAt:   string | null;  // ISO — when credentials were last synced
}

export function useAuth(): UseAuthReturn {
  const [state,      setState]      = useState<AuthState>(() => AuthService.getAuthState());
  const [syncResult, setSyncResult] = useState<SyncResult>("idle");
  const wasOnline                   = useRef(false);
  const navigate                    = useNavigate();

  const reload = useCallback(() => {
    setState(AuthService.getAuthState());
  }, []);

  // ── Push pending offline owner registration ───────────────

  const trySync = useCallback(async () => {
    if (state.status !== "offline-pending") return;
    setSyncResult("syncing");
    const ok = await AuthService.tryCompleteRegistration();
    setSyncResult(ok ? "success" : "failed");
    if (ok) reload();
  }, [state.status, reload]);

  // ── Re-fetch permissions from server ─────────────────────

  const refreshSession = useCallback(async () => {
    const updated = await AuthService.refreshSession();
    if (updated) reload();
  }, [reload]);

  // ── Network watcher ───────────────────────────────────────

  useEffect(() => {
    const CHECK_MS = 5_000;
    const interval = setInterval(async () => {
      const { isOnline } = getNetworkState();

      if (isOnline && !wasOnline.current) {
        wasOnline.current = true;

        // Complete pending owner registration
        if (AuthService.getAuthState().status === "offline-pending") {
          await trySync();
        }

        // Upgrade offline-only session to a real linked one
        if (AuthService.getAuthState().status === "offline-only") {
          const upgraded = await AuthService.tryUpgradeSession();
          if (upgraded) reload();
        }
      }

      if (!isOnline) {
        wasOnline.current = false;
        setSyncResult(r => (r === "failed" ? "idle" : r));
      }
    }, CHECK_MS);

    return () => clearInterval(interval);
  }, [trySync, reload]);

  // ── Session management ────────────────────────────────────

  const logout = useCallback(async () => {
    await AuthService.logout();
    reload();
    navigate("/login");
  }, [reload, navigate]);

  const logoutAndForget = useCallback(async () => {
    await AuthService.logoutAndForget();
    reload();
    navigate("/login");
  }, [reload, navigate]);

  const discardOffline = useCallback(() => {
    AuthService.discardOfflineAccount();
    reload();
  }, [reload]);

  // ── Derived ───────────────────────────────────────────────

  const { user } = state;

  const isOwner   = user?.role === "owner";
  const isManager = user?.role === "manager";
  const isStaff   = user?.role === "staff";

  const can    = useCallback((p: Permission)    => hasPermission(user ?? null, p),      [user]);
  const canAll = useCallback((ps: Permission[]) => hasAllPermissions(user ?? null, ps), [user]);
  const canAny = useCallback((ps: Permission[]) => hasAnyPermission(user ?? null, ps),  [user]);

  const shopIds: string[] = (() => {
    if (!user) return [];
    if (isOwner)   return user.shops?.map(s => s.id) ?? [];
    if (isManager) return user.shopIds ?? (user.shopId ? [user.shopId] : []);
    return user.shopId ? [user.shopId] : [];
  })();

  const activeShopName: string | null = (() => {
    if (!user) return null;
    if (isOwner && user.shops?.length) return user.shops[0].name;
    return user.shopName ?? null;
  })();

  const lastCachedAt: string | null = (() => {
    if (!user) return null;
    const cred = AuthService.getCachedCredential(user.email);
    return cred?.cachedAt ?? null;
  })();

  return {
    ...state,
    syncResult,
    reload,
    trySync,
    refreshSession,
    logout,
    logoutAndForget,
    discardOffline,
    isOwner,
    isManager,
    isStaff,
    can,
    canAll,
    canAny,
    shopIds,
    activeShopName,
    lastCachedAt,
  };
}
