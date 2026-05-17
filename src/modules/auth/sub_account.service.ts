// ─────────────────────────────────────────────────────────────
// src/modules/auth/sub_account.service.ts
//
// Creates and manages manager / staff sub-accounts.
// Called from WITHIN the app (not from AuthPage).
//
// LOCAL-FIRST:
//   All writes go to SubAccountStore immediately.
//   If online → also push to server right away.
//   If offline → enqueue in SyncQueueStore, push when reconnected.
//
// Authority pyramid (enforced locally AND by server):
//   Owner   → create/edit/deactivate managers + staff
//   Manager → create/edit/deactivate staff (in their shops only)
//   Staff   → no sub-account management
// ─────────────────────────────────────────────────────────────

import type {
  AuthUser,
  CreateManagerForm,
  CreateStaffForm,
  UpdatePermissionsForm,
  ManagerRecord,
  StaffRecord,
  LocalSubAccount,
  Permission,
} from "./auth.types";
import { AuthService } from "./auth.service";
import { validatePermissionGrant, MANAGER_DEFAULT_PERMISSIONS, STAFF_DEFAULT_PERMISSIONS } from "./auth.permissions";
import { hashPassword, verifyPassword, generateLocalId, generateQueueId } from "./crypto.utils";
import { SubAccountStore, SyncQueueStore } from "./auth.storage";

// ── API helper ────────────────────────────────────────────────

const SERVER_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

async function api<T>(
  path:   string,
  body?:  object,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = body ? "POST" : "GET",
): Promise<T> {
  const token = AuthService.getToken();
  if (!token || token === "offline") throw new Error("OFFLINE");
  const res = await fetch(`${SERVER_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ── Converters ────────────────────────────────────────────────

function toManagerRecord(a: LocalSubAccount): ManagerRecord {
  return {
    id:          a.serverId ?? a.localId,
    localId:     a.localId,
    serverId:    a.serverId,
    name:        a.name,
    email:       a.email,
    shopIds:     a.shopIds ?? (a.shopId ? [a.shopId] : []),
    permissions: a.permissions,
    active:      a.active,
    syncStatus:  a.syncStatus,
    createdAt:   a.createdAt,
  };
}

function toStaffRecord(a: LocalSubAccount): StaffRecord {
  return {
    id:          a.serverId ?? a.localId,
    localId:     a.localId,
    serverId:    a.serverId,
    name:        a.name,
    email:       a.email,
    shopId:      a.shopId ?? "",
    permissions: a.permissions,
    active:      a.active,
    syncStatus:  a.syncStatus,
    createdAt:   a.createdAt,
  };
}

// ── Role guards ───────────────────────────────────────────────

function assertCanManageStaff(caller: AuthUser): void {
  if (caller.role === "staff") throw new Error("Staff accounts cannot manage other accounts.");
}

function assertCanManageManagers(caller: AuthUser): void {
  if (caller.role !== "owner") throw new Error("Only the owner can manage manager accounts.");
}

function assertShopAccess(caller: AuthUser, shopId: string): void {
  if (caller.role === "owner") return;
  const allowed = caller.shopIds ?? (caller.shopId ? [caller.shopId] : []);
  if (!allowed.includes(shopId)) throw new Error("You don't have access to the specified shop.");
}

// ── Sub-account service ───────────────────────────────────────

export const SubAccountService = {

  // ─────────────── MANAGER (owner only) ────────────────────

  async createManager(creator: AuthUser, form: CreateManagerForm): Promise<ManagerRecord> {
    assertCanManageManagers(creator);

    if (form.permissions) {
      const { valid, invalid } = validatePermissionGrant(creator, form.permissions);
      if (!valid) throw new Error(`Cannot grant permissions: ${invalid.join(", ")}`);
    }

    const permissions = form.permissions ?? [...MANAGER_DEFAULT_PERMISSIONS];
    const passwordHash = await hashPassword(form.password);
    const localId      = generateLocalId();
    const now          = new Date().toISOString();

    // Always write locally first
    const local: LocalSubAccount = {
      localId, role: "manager",
      name: form.name, email: form.email, passwordHash,
      shopIds: form.shopIds, shopId: form.shopIds[0],
      permissions, active: true,
      ownerId: creator.id,
      syncStatus: "pending",
      createdAt: now,
    };
    SubAccountStore.upsert(local);

    // Try pushing to server
    try {
      const serverRecord = await api<{ id: string; [k: string]: unknown }>(
        "/api/sub-accounts/managers", {
          name: form.name, email: form.email, password: form.password,
          shopIds: form.shopIds, permissions,
        }
      );
      SubAccountStore.updateSyncStatus(localId, "synced", serverRecord.id);
    } catch (err) {
      const isOffline = (err as Error).message === "OFFLINE";
      SubAccountStore.updateSyncStatus(localId, isOffline ? "pending" : "failed",
        undefined, isOffline ? undefined : String(err));
      // Enqueue for later sync
      SyncQueueStore.enqueue({
        id: generateQueueId(), type: "create_manager", localId,
        payload: { name: form.name, email: form.email, password: form.password,
                   shopIds: form.shopIds, permissions },
        createdAt: now, attempts: 0, status: "pending",
      });
    }

    return toManagerRecord(SubAccountStore.getByLocalId(localId)!);
  },

  listManagers(shopId?: string): ManagerRecord[] {
    return SubAccountStore.getManagers(shopId)
      .filter(a => a.role === "manager")
      .map(toManagerRecord);
  },

  getManager(localId: string): ManagerRecord | null {
    const a = SubAccountStore.getByLocalId(localId);
    return a && a.role === "manager" ? toManagerRecord(a) : null;
  },

  async updateManager(
    creator: AuthUser,
    localId: string,
    updates: Partial<Pick<CreateManagerForm, "name" | "shopIds">>,
  ): Promise<ManagerRecord> {
    assertCanManageManagers(creator);
    const existing = SubAccountStore.getByLocalId(localId);
    if (!existing) throw new Error("Manager not found.");

    const updated: LocalSubAccount = {
      ...existing,
      ...(updates.name    ? { name: updates.name }       : {}),
      ...(updates.shopIds ? { shopIds: updates.shopIds,
                              shopId: updates.shopIds[0] } : {}),
      syncStatus: "pending",
    };
    SubAccountStore.upsert(updated);

    try {
      const target = existing.serverId ?? localId;
      await api(`/api/sub-accounts/managers/${target}`, updates, "PATCH");
      SubAccountStore.updateSyncStatus(localId, "synced", existing.serverId);
    } catch {
      SyncQueueStore.enqueue({
        id: generateQueueId(), type: "create_manager", localId,
        payload: updates, createdAt: new Date().toISOString(), attempts: 0, status: "pending",
      });
    }

    return toManagerRecord(SubAccountStore.getByLocalId(localId)!);
  },

  async deactivateManager(creator: AuthUser, localId: string): Promise<void> {
    assertCanManageManagers(creator);
    const existing = SubAccountStore.getByLocalId(localId);
    if (!existing) throw new Error("Manager not found.");

    SubAccountStore.upsert({ ...existing, active: false, syncStatus: "pending" });

    try {
      const target = existing.serverId ?? localId;
      await api(`/api/sub-accounts/managers/${target}/deactivate`, {}, "POST");
      SubAccountStore.updateSyncStatus(localId, "synced", existing.serverId);
    } catch {
      SyncQueueStore.enqueue({
        id: generateQueueId(), type: "deactivate_account", localId,
        payload: { role: "manager" },
        createdAt: new Date().toISOString(), attempts: 0, status: "pending",
      });
    }
  },

  async reactivateManager(creator: AuthUser, localId: string): Promise<void> {
    assertCanManageManagers(creator);
    const existing = SubAccountStore.getByLocalId(localId);
    if (!existing) throw new Error("Manager not found.");

    SubAccountStore.upsert({ ...existing, active: true, syncStatus: "pending" });

    try {
      const target = existing.serverId ?? localId;
      await api(`/api/sub-accounts/managers/${target}/reactivate`, {}, "POST");
      SubAccountStore.updateSyncStatus(localId, "synced", existing.serverId);
    } catch {
      SyncQueueStore.enqueue({
        id: generateQueueId(), type: "reactivate_account", localId,
        payload: { role: "manager" },
        createdAt: new Date().toISOString(), attempts: 0, status: "pending",
      });
    }
  },

  // ─────────────── STAFF (owner + manager) ─────────────────

  async createStaff(creator: AuthUser, form: CreateStaffForm): Promise<StaffRecord> {
    assertCanManageStaff(creator);
    if (creator.role === "manager" && !creator.permissions.includes("staff:create")) {
      throw new Error("You don't have permission to create staff accounts.");
    }
    assertShopAccess(creator, form.shopId);

    if (form.permissions) {
      const { valid, invalid } = validatePermissionGrant(creator, form.permissions);
      if (!valid) throw new Error(`Cannot grant permissions: ${invalid.join(", ")}`);
    }

    const permissions  = form.permissions ?? [...STAFF_DEFAULT_PERMISSIONS];
    const passwordHash = await hashPassword(form.password);
    const localId      = generateLocalId();
    const now          = new Date().toISOString();

    const local: LocalSubAccount = {
      localId, role: "staff",
      name: form.name, email: form.email, passwordHash,
      shopId: form.shopId,
      permissions, active: true,
      ownerId: creator.role === "owner" ? creator.id : (creator.ownerId ?? creator.id),
      syncStatus: "pending",
      createdAt: now,
    };
    SubAccountStore.upsert(local);

    try {
      const serverRecord = await api<{ id: string }>(
        "/api/sub-accounts/staff", {
          name: form.name, email: form.email, password: form.password,
          shopId: form.shopId, permissions,
        }
      );
      SubAccountStore.updateSyncStatus(localId, "synced", serverRecord.id);
    } catch (err) {
      const isOffline = (err as Error).message === "OFFLINE";
      SubAccountStore.updateSyncStatus(localId, isOffline ? "pending" : "failed",
        undefined, isOffline ? undefined : String(err));
      SyncQueueStore.enqueue({
        id: generateQueueId(), type: "create_staff", localId,
        payload: { name: form.name, email: form.email, password: form.password,
                   shopId: form.shopId, permissions },
        createdAt: now, attempts: 0, status: "pending",
      });
    }

    return toStaffRecord(SubAccountStore.getByLocalId(localId)!);
  },

  listStaff(shopId: string): StaffRecord[] {
    return SubAccountStore.getStaff(shopId).map(toStaffRecord);
  },

  getStaff(localId: string): StaffRecord | null {
    const a = SubAccountStore.getByLocalId(localId);
    return a && a.role === "staff" ? toStaffRecord(a) : null;
  },

  async updateStaff(
    creator: AuthUser,
    localId: string,
    updates: Partial<Pick<CreateStaffForm, "name">>,
  ): Promise<StaffRecord> {
    assertCanManageStaff(creator);
    if (creator.role === "manager" && !creator.permissions.includes("staff:edit")) {
      throw new Error("You don't have permission to edit staff.");
    }
    const existing = SubAccountStore.getByLocalId(localId);
    if (!existing) throw new Error("Staff not found.");

    SubAccountStore.upsert({ ...existing, ...updates, syncStatus: "pending" });

    try {
      const target = existing.serverId ?? localId;
      await api(`/api/sub-accounts/staff/${target}`, updates, "PATCH");
      SubAccountStore.updateSyncStatus(localId, "synced", existing.serverId);
    } catch {
      SyncQueueStore.enqueue({
        id: generateQueueId(), type: "create_staff", localId,
        payload: updates, createdAt: new Date().toISOString(), attempts: 0, status: "pending",
      });
    }

    return toStaffRecord(SubAccountStore.getByLocalId(localId)!);
  },

  async deactivateStaff(creator: AuthUser, localId: string): Promise<void> {
    assertCanManageStaff(creator);
    if (creator.role === "manager" && !creator.permissions.includes("staff:deactivate")) {
      throw new Error("You don't have permission to deactivate staff.");
    }
    const existing = SubAccountStore.getByLocalId(localId);
    if (!existing) throw new Error("Staff not found.");

    SubAccountStore.upsert({ ...existing, active: false, syncStatus: "pending" });

    try {
      const target = existing.serverId ?? localId;
      await api(`/api/sub-accounts/staff/${target}/deactivate`, {}, "POST");
      SubAccountStore.updateSyncStatus(localId, "synced", existing.serverId);
    } catch {
      SyncQueueStore.enqueue({
        id: generateQueueId(), type: "deactivate_account", localId,
        payload: { role: "staff" },
        createdAt: new Date().toISOString(), attempts: 0, status: "pending",
      });
    }
  },

  async reactivateStaff(creator: AuthUser, localId: string): Promise<void> {
    assertCanManageStaff(creator);
    const existing = SubAccountStore.getByLocalId(localId);
    if (!existing) throw new Error("Staff not found.");

    SubAccountStore.upsert({ ...existing, active: true, syncStatus: "pending" });

    try {
      const target = existing.serverId ?? localId;
      await api(`/api/sub-accounts/staff/${target}/reactivate`, {}, "POST");
      SubAccountStore.updateSyncStatus(localId, "synced", existing.serverId);
    } catch {
      SyncQueueStore.enqueue({
        id: generateQueueId(), type: "reactivate_account", localId,
        payload: { role: "staff" },
        createdAt: new Date().toISOString(), attempts: 0, status: "pending",
      });
    }
  },

  // ─────────────── Permissions ──────────────────────────────

  async updatePermissions(
    caller:     AuthUser,
    targetRole: "manager" | "staff",
    form:       UpdatePermissionsForm,
  ): Promise<void> {
    if (caller.role === "staff") throw new Error("Staff cannot manage permissions.");
    if (caller.role === "manager" && targetRole === "manager") {
      throw new Error("Managers cannot change other managers' permissions.");
    }
    if (caller.role === "manager" && !caller.permissions.includes("staff:permissions")) {
      throw new Error("You don't have permission to manage staff permissions.");
    }

    const { valid, invalid } = validatePermissionGrant(caller, form.permissions);
    if (!valid) throw new Error(`Cannot grant permissions: ${invalid.join(", ")}`);

    const existing = SubAccountStore.getByLocalId(form.userId) ??
      SubAccountStore.getAll().find(a => a.serverId === form.userId);
    if (!existing) throw new Error("Account not found.");

    SubAccountStore.upsert({ ...existing, permissions: form.permissions, syncStatus: "pending" });

    const endpoint = targetRole === "manager"
      ? `/api/sub-accounts/managers/${existing.serverId ?? form.userId}/permissions`
      : `/api/sub-accounts/staff/${existing.serverId ?? form.userId}/permissions`;

    try {
      await api<void>(endpoint, { permissions: form.permissions }, "PUT");
      SubAccountStore.updateSyncStatus(existing.localId, "synced", existing.serverId);
    } catch {
      SyncQueueStore.enqueue({
        id: generateQueueId(), type: "update_permissions", localId: existing.localId,
        payload: { targetRole, permissions: form.permissions },
        createdAt: new Date().toISOString(), attempts: 0, status: "pending",
      });
    }
  },

  async grantPermissions(
    caller:     AuthUser,
    targetRole: "manager" | "staff",
    targetId:   string,
    perms:      Permission[],
  ): Promise<void> {
    const existing = SubAccountStore.getByLocalId(targetId) ??
      SubAccountStore.getAll().find(a => a.serverId === targetId);
    if (!existing) throw new Error("Account not found.");

    const merged = Array.from(new Set([...existing.permissions, ...perms]));
    await this.updatePermissions(caller, targetRole, { userId: targetId, permissions: merged });
  },

  async revokePermissions(
    caller:     AuthUser,
    targetRole: "manager" | "staff",
    targetId:   string,
    perms:      Permission[],
  ): Promise<void> {
    const existing = SubAccountStore.getByLocalId(targetId) ??
      SubAccountStore.getAll().find(a => a.serverId === targetId);
    if (!existing) throw new Error("Account not found.");

    const revoked = existing.permissions.filter(p => !perms.includes(p));
    await this.updatePermissions(caller, targetRole, { userId: targetId, permissions: revoked });
  },

  // ─────────────── Password reset ───────────────────────────

  async resetPassword(
    caller:      AuthUser,
    targetRole:  "manager" | "staff",
    localId:     string,
    newPassword: string,
  ): Promise<void> {
    if (caller.role === "staff") throw new Error("Staff cannot reset passwords.");
    if (caller.role === "manager" && targetRole === "manager") {
      throw new Error("Managers cannot reset other managers' passwords.");
    }

    const existing = SubAccountStore.getByLocalId(localId);
    if (!existing) throw new Error("Account not found.");

    // Update local password hash immediately
    const passwordHash = await hashPassword(newPassword);
    SubAccountStore.upsert({ ...existing, passwordHash, syncStatus: "pending" });

    const endpoint = targetRole === "manager"
      ? `/api/sub-accounts/managers/${existing.serverId ?? localId}/reset-password`
      : `/api/sub-accounts/staff/${existing.serverId ?? localId}/reset-password`;

    try {
      await api<void>(endpoint, { newPassword }, "POST");
      SubAccountStore.updateSyncStatus(localId, "synced", existing.serverId);
    } catch {
      SyncQueueStore.enqueue({
        id: generateQueueId(), type: "reset_password", localId,
        payload: { targetRole, newPassword },
        createdAt: new Date().toISOString(), attempts: 0, status: "pending",
      });
    }
  },

  // ─────────────── Offline login for sub-accounts ───────────
  //
  // When a manager or staff tries to log in while offline,
  // we look them up in the local SubAccountStore and verify
  // their password hash — no server needed.

  async verifyLocalLogin(email: string, password: string): Promise<LocalSubAccount | null> {
    const account = SubAccountStore.getByEmail(email);
    if (!account) return null;
    const ok = await verifyPassword(password, account.passwordHash);
    return ok ? account : null;
  },

  /** Build an AuthUser from a local sub-account for offline sessions */
  buildOfflineUser(account: LocalSubAccount): AuthUser {
    return {
      id:          account.serverId ?? account.localId,
      name:        account.name,
      email:       account.email,
      role:        account.role,
      
      token:       "offline",
      linkedAt:    account.createdAt,
      ownerId:     account.ownerId,
      shopId:      account.shopId,
      shopIds:     account.shopIds,
      shopName:    account.shopName,
      permissions: account.permissions,
    };
  },
};
