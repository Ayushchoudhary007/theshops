// src/modules/auth/auth.service.ts
//
// LOCAL-FIRST auth — server URL comes from VITE_API_URL only.
// Never asks the user for a server URL.
//
// OFFLINE → register/login work fully on-device. Single device only.
// ONLINE  → server confirms identity. Token cached for offline use.

import type { AuthUser, AuthState, LoginForm, RegisterForm, OfflineAccount, LocalCredential } from "./auth.types";
import { OWNER_PERMISSIONS } from "./auth.permissions";
import { hashPassword, verifyPassword, generateLocalId } from "./crypto.utils";
import { UserStore, OfflineAccountStore, CredentialStore } from "./auth.storage";
import { clearUserData } from "../../database";

// ── Single source of truth for server URL ─────────────────────
// Set VITE_API_URL in your .env. Never exposed to the user.

// Ensure the URL always has a protocol — guards against missing https:// in env var
function normaliseUrl(raw: string | undefined): string {
  const url = (raw ?? "http://localhost:4000").trim().replace(/\/$/, "");
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}
const SERVER_URL = normaliseUrl(import.meta.env.VITE_API_URL);

// ── Internal fetch ────────────────────────────────────────────

async function serverFetch<T>(
  path:   string,
  body?:  object,
  token?: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = body ? "POST" : "GET",
): Promise<T> {
  const res = await fetch(`${SERVER_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

interface ServerAuthResponse {
  token: string;
  user:  Omit<AuthUser, "token" | "linkedAt">;
}

// ── Public service ────────────────────────────────────────────

export const AuthService = {

  getAuthState(): AuthState {
    const user    = UserStore.get();
    const offline = OfflineAccountStore.get();
    if (user) {
      const isOfflineSession = user.token === "offline";
      return { status: isOfflineSession ? "offline-only" : "linked", user, offlineAccount: null, isOfflineSession };
    }
    if (offline) {
      return { status: "offline-pending", user: null, offlineAccount: offline, isOfflineSession: false };
    }
    return { status: "guest", user: null, offlineAccount: null, isOfflineSession: false };
  },

  // Health check — used in AuthPage to show server status indicator
  async ping(): Promise<{ ok: boolean; version?: string; latency?: number }> {
    const t0 = Date.now();
    try {
      const data = await serverFetch<{ version?: string }>("/api/ping");
      return { ok: true, version: data.version, latency: Date.now() - t0 };
    } catch {
      return { ok: false };
    }
  },

  // ── Register (owner only) ─────────────────────────────────

  async register(form: RegisterForm, isOnline: boolean): Promise<{ kind: "linked" | "offline-pending" }> {
    const passwordHash = await hashPassword(form.password);

    if (isOnline) {
      try {
        const regRes = await fetch(`${SERVER_URL}/api/auth/register/owner`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, email: form.email, password: form.password, shopName: form.shopName }),
        });
        if (regRes.status === 409) {
          throw new Error("An account with this email already exists. Please sign in instead.");
        }
        if (!regRes.ok) {
          const body = await regRes.json().catch(() => ({})) as any;
          throw new Error(body.error ?? "Registration failed");
        }
        const data = await regRes.json() as ServerAuthResponse;
        const user: AuthUser = {
          ...data.user, token: data.token,
          linkedAt:    new Date().toISOString(),
          permissions: data.user.permissions ?? [...OWNER_PERMISSIONS],
        };
        UserStore.set(user);
        OfflineAccountStore.clear();
        CredentialStore.upsert({ email: form.email, passwordHash, userSnapshot: user, cachedAt: new Date().toISOString() });
        return { kind: "linked" };
      } catch {
        // Server unreachable — fall through to offline path
      }
    }

    // Offline path
    const acc: OfflineAccount = {
      name: form.name, email: form.email, shopName: form.shopName,
      _pendingPassword: form.password, createdOfflineAt: new Date().toISOString(),
    };
    OfflineAccountStore.set(acc);

    const localUser: AuthUser = {
      id: generateLocalId(), name: form.name, email: form.email,
      role: "owner", token: "offline",
      linkedAt: new Date().toISOString(), permissions: [...OWNER_PERMISSIONS],
      shops: [{ id: generateLocalId(), name: form.shopName, ownerId: "local", createdAt: new Date().toISOString() }],
    };
    UserStore.set(localUser);
    CredentialStore.upsert({ email: form.email, passwordHash, userSnapshot: localUser, cachedAt: new Date().toISOString() });
    return { kind: "offline-pending" };
  },

  // ── Complete offline registration when network returns ────

  async tryCompleteRegistration(): Promise<boolean> {
    const offline = OfflineAccountStore.get();
    if (!offline) return false;
    try {
      const data = await serverFetch<ServerAuthResponse>("/api/auth/register/owner", {
        name: offline.name, email: offline.email,
        password: offline._pendingPassword, shopName: offline.shopName,
      });
      const user: AuthUser = {
        ...data.user, token: data.token,
        linkedAt:    new Date().toISOString(),
        permissions: data.user.permissions ?? [...OWNER_PERMISSIONS],
      };
      UserStore.set(user);
      OfflineAccountStore.clear();
      const passwordHash = await hashPassword(offline._pendingPassword);
      CredentialStore.upsert({ email: offline.email, passwordHash, userSnapshot: user, cachedAt: new Date().toISOString() });
      return true;
    } catch {
      return false;
    }
  },

  // ── Login (all roles) ─────────────────────────────────────

  async login(form: LoginForm): Promise<{ user: AuthUser; mode: "linked" | "offline-only" }> {
    // Try server — capture status code separately to handle 401 cases distinctly
    let serverStatus = 0;
    let serverErrMsg = "";
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      serverStatus = res.status;
      if (res.ok) {
        const data = await res.json() as ServerAuthResponse;
        const user: AuthUser = {
          ...data.user, token: data.token,
          linkedAt:    new Date().toISOString(),
          permissions: data.user.permissions ?? [],
        };
        UserStore.set(user);
        OfflineAccountStore.clear();
        const passwordHash = await hashPassword(form.password);
        CredentialStore.upsert({ email: form.email, passwordHash, userSnapshot: user, cachedAt: new Date().toISOString() });
        return { user, mode: "linked" };
      }
      const body = await res.json().catch(() => ({})) as Record<string, string>;
      serverErrMsg = body["error"] ?? `Server error ${res.status}`;
    } catch {
      // Network unreachable — serverStatus stays 0
    }

    // 401 "No account found" = user registered offline, account never reached server.
    // Auto-register them now using their cached credentials.
    if (serverStatus === 401 && serverErrMsg.toLowerCase().includes("no account")) {
      const cred = CredentialStore.getByEmail(form.email);
      if (cred && await verifyPassword(form.password, cred.passwordHash)) {
        try {
          const snap     = cred.userSnapshot;
          const shopName = snap.shops?.[0]?.name ?? snap.shopName ?? "My Shop";
          const regRes   = await fetch(`${SERVER_URL}/api/auth/register/owner`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: snap.name, email: form.email, password: form.password, shopName }),
          });
          if (regRes.ok) {
            const data = await regRes.json() as ServerAuthResponse;
            const user: AuthUser = {
              ...data.user, token: data.token,
              linkedAt:    new Date().toISOString(),
              permissions: data.user.permissions ?? [],
            };
            UserStore.set(user);
            OfflineAccountStore.clear();
            const passwordHash = await hashPassword(form.password);
            CredentialStore.upsert({ email: form.email, passwordHash, userSnapshot: user, cachedAt: new Date().toISOString() });
            return { user, mode: "linked" };
          }
        } catch { /* fall through to offline */ }
      }
    }

    // 401 with a real auth error (wrong password) — don't fall through to offline
    if (serverStatus === 401 && serverErrMsg && !serverErrMsg.toLowerCase().includes("no account")) {
      throw new Error(serverErrMsg);
    }

    // Server unreachable — use offline credential cache
    const cred = CredentialStore.getByEmail(form.email);
    if (!cred) {
      throw new Error(
        "Cannot reach the server and no offline credentials found.\n" +
        "Please connect to the internet and log in at least once on this device."
      );
    }
    if (!await verifyPassword(form.password, cred.passwordHash)) {
      throw new Error("Incorrect password.");
    }
    const offlineUser: AuthUser = { ...cred.userSnapshot, token: "offline", linkedAt: cred.cachedAt };
    UserStore.set(offlineUser);
    return { user: offlineUser, mode: "offline-only" };
  },

  // ── Session refresh ───────────────────────────────────────

  async refreshSession(): Promise<AuthUser | null> {
    const current = UserStore.get();
    if (!current || current.token === "offline") return null;
    try {
      const data = await serverFetch<{ user: ServerAuthResponse["user"]; token: string }>(
        "/api/auth/session", undefined, current.token, "GET"
      );
      const refreshed: AuthUser = {
        ...data.user, token: data.token,
        linkedAt:    current.linkedAt,
        permissions: data.user.permissions ?? current.permissions,
      };
      UserStore.set(refreshed);
      const cred = CredentialStore.getByEmail(current.email);
      if (cred) CredentialStore.upsert({ ...cred, userSnapshot: refreshed, cachedAt: new Date().toISOString() });
      return refreshed;
    } catch {
      return null;
    }
  },

  async tryUpgradeSession(): Promise<boolean> {
    // Cannot upgrade without re-entering the password (no plaintext stored).
    // tryCompleteRegistration handles the offline-pending case.
    return false;
  },

  // ── Session management ────────────────────────────────────

  async logout(): Promise<void> {
    UserStore.clear();
    await clearUserData();
  },

  async logoutAndForget(): Promise<void> {
    UserStore.clear();
    OfflineAccountStore.clear();
    CredentialStore.clear();
    await clearUserData();
  },
  discardOfflineAccount() { OfflineAccountStore.clear(); },

  getCachedCredential(email: string): LocalCredential | null {
    return CredentialStore.getByEmail(email);
  },

  getToken(): string | null { return UserStore.getToken(); },

  // serverUrl is no longer per-user — always from env
  getServerUrl(): string { return SERVER_URL; },
};
