// src/modules/auth/auth.storage.ts
// All localStorage access for the auth module in one place.

import type {
  AuthUser, OfflineAccount, LocalCredential,
  LocalSubAccount, SyncQueueItem,
} from "./auth.types";

const K = {
  USER:         "theshop_auth_user",
  TOKEN:        "theshop_auth_token",
  OFFLINE_ACCT: "theshop_offline_account",
  CREDENTIALS:  "theshop_local_credentials",
  SUB_ACCOUNTS: "theshop_sub_accounts",
  SYNC_QUEUE:   "theshop_sync_queue",
} as const;

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

function save<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { console.warn(`[theshop] localStorage write failed: ${key}`); }
}

function remove(key: string): void { localStorage.removeItem(key); }

// ── Auth user ─────────────────────────────────────────────────
// ServerUrl is no longer stored per-user — it comes from VITE_API_URL.

export const UserStore = {
  get():           AuthUser | null { return load<AuthUser>(K.USER); },
  set(u: AuthUser): void {
    save(K.USER, u);
    localStorage.setItem(K.TOKEN, u.token);
    // No longer storing serverUrl per-user
  },
  clear(): void { remove(K.USER); remove(K.TOKEN); },
  getToken(): string | null { return localStorage.getItem(K.TOKEN); },
};

export const OfflineAccountStore = {
  get():                    OfflineAccount | null { return load<OfflineAccount>(K.OFFLINE_ACCT); },
  set(acc: OfflineAccount): void { save(K.OFFLINE_ACCT, acc); },
  clear():                  void { remove(K.OFFLINE_ACCT); },
};

export const CredentialStore = {
  getAll(): LocalCredential[] {
    return load<LocalCredential[]>(K.CREDENTIALS) ?? [];
  },
  getByEmail(email: string): LocalCredential | null {
    return this.getAll().find(c => c.email.toLowerCase() === email.toLowerCase()) ?? null;
  },
  upsert(cred: LocalCredential): void {
    const all = this.getAll().filter(c => c.email.toLowerCase() !== cred.email.toLowerCase());
    save(K.CREDENTIALS, [...all, cred]);
  },
  remove(email: string): void {
    save(K.CREDENTIALS, this.getAll().filter(c => c.email.toLowerCase() !== email.toLowerCase()));
  },
  clear(): void { remove(K.CREDENTIALS); },
};

export const SubAccountStore = {
  getAll(): LocalSubAccount[] { return load<LocalSubAccount[]>(K.SUB_ACCOUNTS) ?? []; },
  getByLocalId(localId: string): LocalSubAccount | null {
    return this.getAll().find(a => a.localId === localId) ?? null;
  },
  getByEmail(email: string): LocalSubAccount | null {
    return this.getAll().find(a => a.email.toLowerCase() === email.toLowerCase() && a.active) ?? null;
  },
  getByOwner(ownerId: string): LocalSubAccount[] {
    return this.getAll().filter(a => a.ownerId === ownerId);
  },
  getManagers(shopId?: string): LocalSubAccount[] {
    return this.getAll().filter(a =>
      a.role === "manager" && a.active &&
      (shopId ? (a.shopIds?.includes(shopId) || a.shopId === shopId) : true)
    );
  },
  getStaff(shopId: string): LocalSubAccount[] {
    return this.getAll().filter(a => a.role === "staff" && a.shopId === shopId && a.active);
  },
  upsert(account: LocalSubAccount): void {
    const all = this.getAll().filter(a => a.localId !== account.localId);
    save(K.SUB_ACCOUNTS, [...all, account]);
  },
  updateSyncStatus(localId: string, status: LocalSubAccount["syncStatus"], serverId?: string, error?: string): void {
    save(K.SUB_ACCOUNTS, this.getAll().map(a => {
      if (a.localId !== localId) return a;
      return {
        ...a, syncStatus: status,
        ...(serverId ? { serverId } : {}),
        ...(error    ? { syncError: error } : { syncError: undefined }),
        ...(status === "synced" ? { syncedAt: new Date().toISOString() } : {}),
      };
    }));
  },
  remove(localId: string): void {
    save(K.SUB_ACCOUNTS, this.getAll().filter(a => a.localId !== localId));
  },
  clear(): void { remove(K.SUB_ACCOUNTS); },
};

export const SyncQueueStore = {
  getAll(): SyncQueueItem[] { return load<SyncQueueItem[]>(K.SYNC_QUEUE) ?? []; },
  getPending(): SyncQueueItem[] {
    return this.getAll().filter(i => i.status === "pending" || i.status === "failed");
  },
  enqueue(item: SyncQueueItem): void {
    save(K.SYNC_QUEUE, [...this.getAll(), item]);
  },
  updateItem(id: string, updates: Partial<SyncQueueItem>): void {
    save(K.SYNC_QUEUE, this.getAll().map(i => i.id === id ? { ...i, ...updates } : i));
  },
  markDone(id: string): void { this.updateItem(id, { status: "done" }); },
  markFailed(id: string, error: string): void {
    const item = this.getAll().find(i => i.id === id);
    if (!item) return;
    this.updateItem(id, { status: "failed", attempts: item.attempts + 1, lastError: error });
  },
  pruneCompleted(): void {
    save(K.SYNC_QUEUE, this.getAll().filter(i => i.status !== "done"));
  },
  clear(): void { remove(K.SYNC_QUEUE); },
};
