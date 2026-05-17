// src/modules/auth/auth.types.ts

export type UserRole = "owner" | "manager" | "staff";

export type Permission =
  | "pos:use" | "pos:discount" | "pos:refund" | "pos:void"
  | "inventory:view" | "inventory:create" | "inventory:edit" | "inventory:delete"
  | "orders:view" | "orders:create" | "orders:edit" | "orders:cancel"
  | "customers:view" | "customers:create" | "customers:edit" | "customers:delete"
  | "reports:view" | "reports:export" | "reports:financial"
  | "staff:view" | "staff:create" | "staff:edit" | "staff:deactivate" | "staff:permissions"
  | "managers:view" | "managers:create" | "managers:edit" | "managers:deactivate" | "managers:permissions"
  | "settings:view" | "settings:edit" | "settings:integrations"
  | "finance:view" | "finance:edit" | "finance:payroll"
  | "shop:create" | "shop:edit" | "shop:delete" | "shop:assign_manager";

export interface Shop {
  id:        string;
  name:      string;
  ownerId:   string;
  address?:  string;
  createdAt: string;
}

export interface AuthUser {
  id:          string;
  name:        string;
  email:       string;
  role:        UserRole;
  avatar?:     string;
  token:       string;
  linkedAt:    string;
  shops?:      Shop[];
  ownerId?:    string;
  shopId?:     string;
  shopIds?:    string[];
  shopName?:   string;
  permissions: Permission[];
}

export type SyncStatus = "local" | "pending" | "syncing" | "synced" | "failed";

export interface LocalCredential {
  email:        string;
  passwordHash: string;
  userSnapshot: AuthUser;
  cachedAt:     string;
}

export interface LocalSubAccount {
  localId:      string;
  serverId?:    string;
  role:         "manager" | "staff";
  name:         string;
  email:        string;
  passwordHash: string;
  shopId?:      string;
  shopIds?:     string[];
  shopName?:    string;
  permissions:  Permission[];
  active:       boolean;
  ownerId:      string;
  syncStatus:   SyncStatus;
  syncError?:   string;
  createdAt:    string;
  syncedAt?:    string;
}

export type SyncOperationType =
  | "register_owner" | "create_manager" | "create_staff"
  | "update_permissions" | "deactivate_account"
  | "reactivate_account" | "reset_password";

export interface SyncQueueItem {
  id:         string;
  type:       SyncOperationType;
  payload:    Record<string, unknown>;
  localId?:   string;
  createdAt:  string;
  attempts:   number;
  lastError?: string;
  status:     "pending" | "syncing" | "done" | "failed";
}

export interface CreateManagerForm {
  name:         string;
  email:        string;
  password:     string;
  shopIds:      string[];
  permissions?: Permission[];
}

export interface CreateStaffForm {
  name:         string;
  email:        string;
  password:     string;
  shopId:       string;
  permissions?: Permission[];
}

export interface UpdatePermissionsForm {
  userId:      string;
  permissions: Permission[];
}

// serverUrl removed — fixed via VITE_API_URL
export interface LoginForm {
  email:    string;
  password: string;
  remember: boolean;
}

export interface RegisterForm {
  name:            string;
  email:           string;
  password:        string;
  confirmPassword: string;
  shopName:        string;
}

export type AuthTab = "login" | "register";

export interface OfflineAccount {
  name:             string;
  email:            string;
  shopName:         string;
  _pendingPassword: string;
  createdOfflineAt: string;
}

export type AccountStatus =
  | "guest"
  | "offline-only"
  | "offline-pending"
  | "linked";

export interface AuthState {
  status:           AccountStatus;
  user:             AuthUser | null;
  offlineAccount:   OfflineAccount | null;
  isOfflineSession: boolean;
}

export interface ManagerRecord {
  id:          string;
  localId:     string;
  serverId?:   string;
  name:        string;
  email:       string;
  shopIds:     string[];
  permissions: Permission[];
  active:      boolean;
  syncStatus:  SyncStatus;
  createdAt:   string;
}

export interface StaffRecord {
  id:          string;
  localId:     string;
  serverId?:   string;
  name:        string;
  email:       string;
  shopId:      string;
  permissions: Permission[];
  active:      boolean;
  syncStatus:  SyncStatus;
  createdAt:   string;
}
