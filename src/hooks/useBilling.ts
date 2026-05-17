// src/hooks/useBilling.ts
//
// Manages the active bill draft in state.
// Exposes helpers so Billing.tsx stays clean.

import { useState, useCallback } from "react";
import { BillingService, computeSummary } from "../modules/billing/billing.service";
import type { BillDraft, BillItem, Bill, BillSummary } from "../modules/billing/billing.types";

const EMPTY_DRAFT = (): BillDraft => ({
  customer_id:    null,
  customer_name:  "",
  customer_phone: "",
  items:          [],
  discount:       0,
  tax_rate:       18,
  payment_mode:   "cash",
  notes:          "",
});

interface UseBillingReturn {
  draft:     BillDraft;
  summary:   BillSummary;
  saving:    boolean;
  lastBill:  Bill | null;
  setDraft:  React.Dispatch<React.SetStateAction<BillDraft>>;
  addItem:   (item: Omit<BillItem, "total_price">) => void;
  removeItem:(index: number) => void;
  updateQty: (index: number, qty: number) => void;
  clearDraft:() => void;
  saveBill:  () => Promise<Bill | null>;
}

export function useBilling(): UseBillingReturn {
  const [draft,    setDraft]    = useState<BillDraft>(EMPTY_DRAFT());
  const [saving,   setSaving]   = useState(false);
  const [lastBill, setLastBill] = useState<Bill | null>(null);

  const summary = computeSummary(draft.items, draft.discount, draft.tax_rate);

  const addItem = useCallback((item: Omit<BillItem, "total_price">) => {
    setDraft(d => ({
      ...d,
      items: [
        ...d.items,
        { ...item, total_price: item.unit_price * item.quantity },
      ],
    }));
  }, []);

  const removeItem = useCallback((index: number) => {
    setDraft(d => ({ ...d, items: d.items.filter((_, i) => i !== index) }));
  }, []);

  const updateQty = useCallback((index: number, qty: number) => {
    setDraft(d => ({
      ...d,
      items: d.items.map((it, i) =>
        i === index
          ? { ...it, quantity: qty, total_price: qty * it.unit_price }
          : it
      ),
    }));
  }, []);

  const clearDraft = useCallback(() => {
    setDraft(EMPTY_DRAFT());
    setLastBill(null);
  }, []);

  const saveBill = useCallback(async (): Promise<Bill | null> => {
    if (!draft.items.length) return null;
    setSaving(true);
    try {
      const bill = await BillingService.create(draft);
      setLastBill(bill);
      return bill;
    } catch (e) {
      console.error("[useBilling] saveBill error:", e);
      return null;
    } finally {
      setSaving(false);
    }
  }, [draft]);

  return { draft, summary, saving, lastBill, setDraft, addItem, removeItem, updateQty, clearDraft, saveBill };
}
