// src/modules/billing/billing.types.ts

export interface BillItem {
  id?: number;
  bill_id?: number;
  inventory_id?: number | null;
  name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Bill {
  id: number;
  bill_number: string;
  customer_id: number | null;
  customer_name: string;
  customer_phone: string;
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  payment_mode: "cash" | "upi" | "card";
  status: "paid" | "pending" | "cancelled";
  notes: string;
  createdAt: string;
  syncedAt: string | null;
  items?: BillItem[];
}

export type BillDraft = {
  customer_id?: number | null;
  customer_name: string;
  customer_phone: string;
  items: BillItem[];
  discount: number;
  tax_rate: number;
  payment_mode: "cash" | "upi" | "card";
  notes: string;
};

export interface BillSummary {
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
}

export const PAYMENT_MODES = [
  { value: "cash",  label: "Cash",    icon: "💵" },
  { value: "upi",   label: "UPI",     icon: "📱" },
  { value: "card",  label: "Card",    icon: "💳" },
] as const;
