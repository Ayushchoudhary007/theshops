// src/modules/customers/customers.types.ts

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  gst_number: string;
  qr_token: string | null;
  loyalty_pts: number;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}

export type CustomerDraft = Omit<Customer, "id" | "loyalty_pts" | "createdAt" | "updatedAt" | "syncedAt">;

export interface CustomerRow {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  gst_number: string;
  qr_token: string | null;
  loyalty_pts: number;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
  // join: total bills
  total_bills?: number;
  total_spent?: number;
}
