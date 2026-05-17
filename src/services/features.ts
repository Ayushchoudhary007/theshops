// ─────────────────────────────────────────────────────────────
// src/services/features.ts
//
// Single source of truth for every feature's availability.
//
// availability:
//   "always"   — purely local, works with zero network ever
//   "online"   — requires live connection (will be gated in UI)
//   "enhanced" — offline works, online adds extra value
//
// Any component that wants to gate a feature imports
// FEATURES and checks the availability here rather than
// scattering individual isOnline checks everywhere.
// ─────────────────────────────────────────────────────────────

import type { FeatureCapability } from "../sync/offline.types";

export const FEATURES = {
  // ── INVENTORY ─────────────────────────────────────────────

  INVENTORY_VIEW: {
    id: "inventory_view",
    label: "View Inventory",
    availability: "always",
  },

  INVENTORY_ADD: {
    id: "inventory_add",
    label: "Add Product",
    availability: "always",
  },

  INVENTORY_EDIT: {
    id: "inventory_edit",
    label: "Edit Product",
    availability: "always",
  },

  INVENTORY_DELETE: {
    id: "inventory_delete",
    label: "Delete Product",
    availability: "always",
  },

  BARCODE_SCAN: {
    id: "barcode_scan",
    label: "Scan Barcode",
    availability: "enhanced",
    offlineNote: "Scanning works offline — product details won't auto-fill until online.",
    onlineNote:  "Product details will auto-fill from the internet.",
  },

  BARCODE_LOOKUP: {
    id: "barcode_lookup",
    label: "Barcode Product Lookup",
    availability: "online",
    offlineNote: "Auto-fill unavailable offline. Fill in product details manually.",
  },

  IMAGE_UPLOAD: {
    id: "image_upload",
    label: "Upload Product Image",
    availability: "online",
    offlineNote: "Image upload requires a connection. You can add a URL offline.",
  },

  // ── SYNC ──────────────────────────────────────────────────

  SYNC_PUSH: {
    id: "sync_push",
    label: "Sync to Cloud",
    availability: "online",
    offlineNote: "Changes are saved locally and will sync when you go online.",
  },

  SYNC_PULL: {
    id: "sync_pull",
    label: "Pull Remote Changes",
    availability: "online",
    offlineNote: "Remote changes will download when you go online.",
  },

  // ── REPORTS ───────────────────────────────────────────────

  REPORTS_LOCAL: {
    id: "reports_local",
    label: "Basic Reports",
    availability: "always",
    onlineNote: "Advanced analytics available online.",
  },

  REPORTS_ADVANCED: {
    id: "reports_advanced",
    label: "Advanced Analytics",
    availability: "online",
    offlineNote: "Advanced analytics require a connection.",
  },

  REPORTS_EXPORT: {
    id: "reports_export",
    label: "Export Reports",
    availability: "online",
    offlineNote: "Export requires a connection.",
  },

  // ── BILLING ───────────────────────────────────────────────

  BILLING_VIEW: {
    id: "billing_view",
    label: "View Invoices",
    availability: "always",
  },

  BILLING_CREATE: {
    id: "billing_create",
    label: "Create Invoice",
    availability: "always",
    onlineNote: "Invoice will sync to cloud automatically.",
  },

  BILLING_PAYMENT: {
    id: "billing_payment",
    label: "Process Payment",
    availability: "online",
    offlineNote: "Payment processing requires a connection. Invoice saved locally.",
  },

  // ── AUTH ──────────────────────────────────────────────────

  AUTH_LOGIN: {
    id: "auth_login",
    label: "Login",
    availability: "online",
    offlineNote: "Login requires a connection. Existing session remains active.",
  },

} as const satisfies Record<string, FeatureCapability>;

export type FeatureKey = keyof typeof FEATURES;
