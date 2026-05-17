// ─────────────────────────────────────────────────────────────
// src/modules/auth/auth.permissions.ts
// ─────────────────────────────────────────────────────────────

import type { Permission, UserRole, AuthUser } from "./auth.types";

export const OWNER_PERMISSIONS: Permission[] = [
  "pos:use", "pos:discount", "pos:refund", "pos:void",
  "inventory:view", "inventory:create", "inventory:edit", "inventory:delete",
  "orders:view", "orders:create", "orders:edit", "orders:cancel",
  "customers:view", "customers:create", "customers:edit", "customers:delete",
  "reports:view", "reports:export", "reports:financial",
  "staff:view", "staff:create", "staff:edit", "staff:deactivate", "staff:permissions",
  "managers:view", "managers:create", "managers:edit", "managers:deactivate", "managers:permissions",
  "settings:view", "settings:edit", "settings:integrations",
  "finance:view", "finance:edit", "finance:payroll",
  "shop:create", "shop:edit", "shop:delete", "shop:assign_manager",
];

export const MANAGER_DEFAULT_PERMISSIONS: Permission[] = [
  "pos:use", "pos:discount", "pos:refund",
  "inventory:view", "inventory:create", "inventory:edit",
  "orders:view", "orders:create", "orders:edit", "orders:cancel",
  "customers:view", "customers:create", "customers:edit",
  "reports:view", "reports:export",
  "staff:view", "staff:create", "staff:edit", "staff:deactivate",
  "settings:view",
  "finance:view",
];

export const STAFF_DEFAULT_PERMISSIONS: Permission[] = [
  "pos:use",
  "inventory:view",
  "orders:view", "orders:create",
  "customers:view", "customers:create",
];

export function defaultPermissionsFor(role: UserRole): Permission[] {
  switch (role) {
    case "owner":   return [...OWNER_PERMISSIONS];
    case "manager": return [...MANAGER_DEFAULT_PERMISSIONS];
    case "staff":   return [...STAFF_DEFAULT_PERMISSIONS];
  }
}

/** Owner always passes. Others need the specific permission in their list. */
export function hasPermission(user: AuthUser | null, permission: Permission): boolean {
  if (!user) return false;
  if (user.role === "owner") return true;
  return user.permissions.includes(permission);
}

export function hasAllPermissions(user: AuthUser | null, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(user, p));
}

export function hasAnyPermission(user: AuthUser | null, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(user, p));
}

/**
 * What permissions can `creator` grant to a sub-account?
 * You cannot grant what you don't have; managers cannot grant shop/manager perms.
 */
export function grantablePermissions(creator: AuthUser): Permission[] {
  if (creator.role === "owner") return [...OWNER_PERMISSIONS];
  return creator.permissions.filter(
    p => !p.startsWith("managers:") && !p.startsWith("shop:")
  );
}

export function validatePermissionGrant(
  creator:  AuthUser,
  proposed: Permission[],
): { valid: boolean; invalid: Permission[] } {
  const grantable = new Set(grantablePermissions(creator));
  const invalid   = proposed.filter(p => !grantable.has(p));
  return { valid: invalid.length === 0, invalid };
}

// ── Permission groups for UI ──────────────────────────────────

export type PermissionGroup = {
  label:       string;
  icon:        string;
  permissions: { key: Permission; label: string; description: string }[];
};

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: "Point of Sale", icon: "🛒",
    permissions: [
      { key: "pos:use",      label: "Use POS",        description: "Process sales at the counter" },
      { key: "pos:discount", label: "Apply Discounts", description: "Apply discounts on items or totals" },
      { key: "pos:refund",   label: "Process Refunds", description: "Refund completed transactions" },
      { key: "pos:void",     label: "Void Sales",      description: "Void/cancel in-progress sales" },
    ],
  },
  {
    label: "Inventory", icon: "📦",
    permissions: [
      { key: "inventory:view",   label: "View Inventory", description: "See stock levels and items" },
      { key: "inventory:create", label: "Add Items",      description: "Add new products to inventory" },
      { key: "inventory:edit",   label: "Edit Items",     description: "Update prices, stock, details" },
      { key: "inventory:delete", label: "Delete Items",   description: "Remove products permanently" },
    ],
  },
  {
    label: "Orders", icon: "📋",
    permissions: [
      { key: "orders:view",   label: "View Orders",   description: "See all orders" },
      { key: "orders:create", label: "Create Orders", description: "Place new orders" },
      { key: "orders:edit",   label: "Edit Orders",   description: "Modify existing orders" },
      { key: "orders:cancel", label: "Cancel Orders", description: "Cancel open orders" },
    ],
  },
  {
    label: "Customers", icon: "👥",
    permissions: [
      { key: "customers:view",   label: "View Customers",   description: "See customer list and profiles" },
      { key: "customers:create", label: "Add Customers",    description: "Create new customer records" },
      { key: "customers:edit",   label: "Edit Customers",   description: "Update customer information" },
      { key: "customers:delete", label: "Delete Customers", description: "Remove customer records" },
    ],
  },
  {
    label: "Reports", icon: "📊",
    permissions: [
      { key: "reports:view",      label: "View Reports",     description: "Access sales and operational reports" },
      { key: "reports:export",    label: "Export Reports",   description: "Download report data" },
      { key: "reports:financial", label: "Financial Reports",description: "View profit, cost and financial data" },
    ],
  },
  {
    label: "Staff Management", icon: "🧑‍🔧",
    permissions: [
      { key: "staff:view",        label: "View Staff",         description: "See staff member list" },
      { key: "staff:create",      label: "Create Staff",       description: "Add new staff accounts" },
      { key: "staff:edit",        label: "Edit Staff",         description: "Update staff details" },
      { key: "staff:deactivate",  label: "Deactivate Staff",   description: "Suspend staff access" },
      { key: "staff:permissions", label: "Manage Permissions", description: "Change staff access rights" },
    ],
  },
  {
    label: "Settings", icon: "⚙️",
    permissions: [
      { key: "settings:view",         label: "View Settings",  description: "See shop configuration" },
      { key: "settings:edit",         label: "Edit Settings",  description: "Modify shop configuration" },
      { key: "settings:integrations", label: "Integrations",   description: "Manage third-party integrations" },
    ],
  },
  {
    label: "Finance", icon: "💰",
    permissions: [
      { key: "finance:view",    label: "View Finance", description: "See financial summaries" },
      { key: "finance:edit",    label: "Edit Finance", description: "Record expenses and adjustments" },
      { key: "finance:payroll", label: "Payroll",      description: "Manage staff payroll" },
    ],
  },
];
