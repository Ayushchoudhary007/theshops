// src/modules/billing/pages/Billing.tsx
//
// Responsive layout:
//   Mobile  (<768px)  — single column, tab bar (Form / Preview / History),
//                       sticky bottom bar with total + save CTA,
//                       preview rendered as full-screen modal sheet.
//   Tablet  (768-1199)— left form panel (400px) + right preview panel,
//                       preview toggle button replaces always-on panel.
//   Desktop (≥1200px) — three-zone: sidebar form | item area | live preview.

import { useState, useEffect, useCallback, useRef } from "react";
import { BRAND, RADIUS, COLOR, GLOBAL_STYLES } from "../../../design-tokens";
import { BillingService, computeSummary } from "../billing.service";
import { CustomerService } from "../../customers/customers.service";
import type { BillDraft, Bill } from "../billing.types";//there also this BillItem
import { PAYMENT_MODES } from "../billing.types";
import type { Customer } from "../../customers/customers.types";
import QRScanner from "../components/QRScanner";
import BillPreview from "../components/BillPreview";
import { query } from "../../../database";

// ── Responsive CSS ────────────────────────────────────────────────────────────
const RESPONSIVE_STYLES = `
  /* ── Base layout shells ── */
  .bl-root {
    display: flex;
    height: 100vh;
    overflow: hidden;
    font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
    background: linear-gradient(135deg,
      #fce4e4 0%, #fde8d8 20%, #fef9c3 40%,
      #dcfce7 60%, #dbeafe 80%, #ede9fe 100%);
    background-attachment: fixed;
    position: relative;
  }

  /* ── Left panel (form) ── */
  .bl-form-panel {
    width: 400px;
    min-width: 400px;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    border-right: 1px solid rgba(255,255,255,0.55);
    background: rgba(255,255,255,0.52);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }
  .bl-form-panel::-webkit-scrollbar { width: 3px; }
  .bl-form-panel::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 3px; }

  /* ── Right panel (preview) ── */
  .bl-preview-panel {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px 20px;
    gap: 16px;
  }
  .bl-preview-panel::-webkit-scrollbar { width: 3px; }
  .bl-preview-panel::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 3px; }

  /* ── Mobile tab bar ── */
  .bl-tab-bar {
    display: none;
  }

  /* ── Mobile bottom bar ── */
  .bl-bottom-bar {
    display: none;
  }

  /* ── Mobile preview sheet ── */
  .bl-preview-sheet {
    display: none;
  }

  /* ── History panel ── */
  .bl-history-panel {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }
  .bl-history-panel::-webkit-scrollbar { width: 3px; }
  .bl-history-panel::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 3px; }

  /* ── Section label ── */
  .bl-section-label {
    font-size: 10px;
    font-weight: 800;
    color: ${COLOR.textMid};
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 10px;
  }

  /* ── Item row ── */
  .bl-item-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid rgba(0,0,0,0.05);
    animation: slideIn 0.18s ease;
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Qty stepper ── */
  .bl-qty-stepper {
    display: flex;
    align-items: center;
    gap: 0;
    border: 1px solid rgba(255,255,255,0.70);
    border-radius: 8px;
    overflow: hidden;
    background: rgba(255,255,255,0.55);
  }
  .bl-qty-btn {
    width: 26px;
    height: 30px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    color: ${COLOR.textMid};
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.12s;
    flex-shrink: 0;
  }
  .bl-qty-btn:hover { background: rgba(192,57,43,0.08); }
  .bl-qty-input {
    width: 34px;
    text-align: center;
    border: none;
    background: none;
    font-size: 13px;
    font-family: inherit;
    color: ${COLOR.text};
    padding: 0;
    outline: none;
    -moz-appearance: textfield;
  }
  .bl-qty-input::-webkit-outer-spin-button,
  .bl-qty-input::-webkit-inner-spin-button { -webkit-appearance: none; }

  /* ── Payment pill buttons ── */
  .bl-pay-btn {
    flex: 1;
    padding: 9px 4px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 10px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    border: 1.5px solid rgba(255,255,255,0.65);
    background: rgba(255,255,255,0.45);
    color: ${COLOR.textMid};
  }
  .bl-pay-btn.active {
    border-color: ${BRAND};
    background: rgba(192,57,43,0.10);
    color: ${BRAND};
    box-shadow: 0 2px 8px rgba(192,57,43,0.15);
  }

  /* ── Suggestion dropdown ── */
  .bl-suggestion-item {
    padding: 9px 14px;
    cursor: pointer;
    font-size: 13px;
    border-bottom: 1px solid rgba(255,255,255,0.35);
    transition: background 0.1s;
  }
  .bl-suggestion-item:hover { background: rgba(192,57,43,0.06); }
  .bl-suggestion-item:last-child { border-bottom: none; }

  /* ── History card ── */
  .bl-history-card {
    border-radius: 12px;
    padding: 11px 14px;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255,255,255,0.52);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.65);
    cursor: pointer;
    transition: box-shadow 0.15s, transform 0.15s;
  }
  .bl-history-card:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    transform: translateY(-1px);
  }

  /* ── Add item bar ── */
  .bl-add-bar {
    display: grid;
    grid-template-columns: 1fr 52px 68px auto;
    gap: 6px;
    margin-bottom: 10px;
  }

  /* ── Saved success screen ── */
  .bl-saved-screen {
    min-height: 100vh;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 40px 16px 100px;
    background: linear-gradient(135deg,
      #fce4e4 0%, #fde8d8 20%, #fef9c3 40%,
      #dcfce7 60%, #dbeafe 80%, #ede9fe 100%);
    background-attachment: fixed;
  }

  /* ── No-print ── */
  @media print {
    .bl-no-print { display: none !important; }
  }

  /* ════════════════════════════════════════
     TABLET  768px – 1199px
  ════════════════════════════════════════ */
  @media (max-width: 1199px) {
    .bl-form-panel {
      width: 380px;
      min-width: 320px;
    }
    .bl-preview-panel {
      padding: 20px 14px;
    }
  }

  /* ════════════════════════════════════════
     MOBILE  < 768px
  ════════════════════════════════════════ */
  @media (max-width: 767px) {
    /* Root becomes single-column */
    .bl-root {
      flex-direction: column;
      height: 100dvh;
      overflow: hidden;
    }

    /* Form panel takes all space above tab bar */
    .bl-form-panel {
      width: 100%;
      min-width: unset;
      flex: 1;
      border-right: none;
      border-bottom: 1px solid rgba(255,255,255,0.45);
      /* leave room for sticky bottom bar */
      padding-bottom: 70px;
    }

    /* Hide desktop preview panel on mobile */
    .bl-preview-panel {
      display: none;
    }

    /* Show mobile tab bar */
    .bl-tab-bar {
      display: flex;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 200;
      background: rgba(255,255,255,0.82);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255,255,255,0.55);
      padding: 0 12px;
      height: 52px;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    /* Push form content below fixed tab bar */
    .bl-form-panel {
      padding-top: 60px;
    }

    /* Show mobile sticky bottom CTA */
    .bl-bottom-bar {
      display: flex;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 200;
      background: rgba(255,255,255,0.88);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-top: 1px solid rgba(255,255,255,0.55);
      padding: 10px 16px;
      gap: 10px;
      align-items: center;
    }

    /* Show preview sheet (full-screen slide-up) */
    .bl-preview-sheet {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 300;
      background: linear-gradient(135deg,
        #fce4e4 0%, #fde8d8 20%, #fef9c3 40%,
        #dcfce7 60%, #dbeafe 80%, #ede9fe 100%);
      overflow-y: auto;
      padding: 16px 16px 120px;
      animation: sheetUp 0.28s cubic-bezier(0.32,0.72,0,1);
    }
    @keyframes sheetUp {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }

    /* Compact add-item bar on mobile */
    .bl-add-bar {
      grid-template-columns: 1fr 44px 60px auto;
      gap: 5px;
    }

    /* Larger tap targets */
    .bl-qty-btn { width: 30px; height: 34px; }
  }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPTY_DRAFT = (): BillDraft => ({
  customer_id: null,
  customer_name: "",
  customer_phone: "",
  items: [],
  discount: 0,
  tax_rate: 18,
  payment_mode: "cash",
  notes: "",
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function Billing() {
  const [draft,       setDraft]       = useState<BillDraft>(EMPTY_DRAFT());
  const [customer,    setCustomer]    = useState<Customer | null>(null);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [shopName,    setShopName]    = useState("My Shop");
  const [shopGst,     setShopGst]     = useState("");
  const [shopAddr,    setShopAddr]    = useState("");
  const [billCounter, setBillCounter] = useState(1001);

  // Item entry
  const [iName,  setIName]  = useState("");
  const [iQty,   setIQty]   = useState(1);
  const [iPrice, setIPrice] = useState<number | "">("");

  // UI
  const [showQR,       setShowQR]       = useState(false);
  const [showHistory,  setShowHistory]  = useState(false);
  const [showPreview,  setShowPreview]  = useState(false); // mobile preview sheet
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState<Bill | null>(null);
  const [toast,        setToast]        = useState<string | null>(null);
  const [suggestions,  setSuggestions]  = useState<Customer[]>([]);

  const nameRef  = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  // ── Data loading ───────────────────────────────────────────

  const loadMeta = useCallback(async () => {
    const rows = await query<{ key: string; value: string }>(
      "SELECT key, value FROM meta WHERE key IN ('shop_name','shop_gst','shop_address','bill_counter')"
    );
    rows.forEach(r => {
      if (r.key === "shop_name")    setShopName(r.value);
      if (r.key === "shop_gst")     setShopGst(r.value);
      if (r.key === "shop_address") setShopAddr(r.value);
      if (r.key === "bill_counter") setBillCounter(parseInt(r.value, 10) + 1);
    });
  }, []);

  const loadRecent = useCallback(async () => {
    setRecentBills(await BillingService.list(30));
  }, []);

  useEffect(() => { void loadMeta(); void loadRecent(); }, [loadMeta, loadRecent]);

  // ── Toast ──────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  // ── Customer ───────────────────────────────────────────────

  async function handleQrResult(raw: string) {
    setShowQR(false);
    const parsed = CustomerService.parseQrPayload(raw);
    if (!parsed) { showToast("Could not read QR data"); return; }
    let found: Customer | null = null;
    if (parsed.phone) found = await CustomerService.findByPhone(parsed.phone);
    if (!found && parsed.name) found = await CustomerService.findByQrToken(raw);
    if (found) { applyCustomer(found); showToast(`Customer: ${found.name}`); }
    else {
      setDraft(d => ({ ...d, customer_id: null, customer_name: parsed.name, customer_phone: parsed.phone }));
      showToast("New customer — details pre-filled");
    }
  }

  function applyCustomer(c: Customer) {
    setCustomer(c);
    setDraft(d => ({ ...d, customer_id: c.id, customer_name: c.name, customer_phone: c.phone }));
    setSuggestions([]);
  }

  async function handlePhoneInput(val: string) {
    setDraft(d => ({ ...d, customer_phone: val, customer_id: null }));
    setCustomer(null);
    if (val.length >= 6) {
      setSuggestions(await query<Customer>(
        "SELECT * FROM customers WHERE phone LIKE ? LIMIT 5", [`${val}%`]
      ));
    } else {
      setSuggestions([]);
    }
  }

  // ── Items ──────────────────────────────────────────────────

  function addItem() {
    if (!iName.trim() || !iPrice) { showToast("Enter item name and price"); return; }
    setDraft(d => ({
      ...d,
      items: [...d.items, {
        name: iName.trim(), sku: "", quantity: iQty,
        unit_price: Number(iPrice), total_price: iQty * Number(iPrice),
        inventory_id: null,
      }],
    }));
    setIName(""); setIQty(1); setIPrice("");
    setTimeout(() => nameRef.current?.focus(), 50);
  }

  function removeItem(i: number) {
    setDraft(d => ({ ...d, items: d.items.filter((_, idx) => idx !== i) }));
  }

  function stepQty(i: number, delta: number) {
    setDraft(d => ({
      ...d,
      items: d.items.map((it, idx) => {
        if (idx !== i) return it;
        const qty = Math.max(1, it.quantity + delta);
        return { ...it, quantity: qty, total_price: qty * it.unit_price };
      }),
    }));
  }

  function setQty(i: number, qty: number) {
    if (qty < 1) return;
    setDraft(d => ({
      ...d,
      items: d.items.map((it, idx) =>
        idx === i ? { ...it, quantity: qty, total_price: qty * it.unit_price } : it
      ),
    }));
  }

  // ── Save ───────────────────────────────────────────────────

  async function handleSave() {
    if (!draft.items.length) { showToast("Add at least one item"); return; }
    setSaving(true);
    try {
      const bill = await BillingService.create(draft);
      setSaved(bill);
      await Promise.all([loadRecent(), loadMeta()]);
      showToast(`Bill ${bill.bill_number} created!`);
    } catch (e: any) {
      showToast(`Error: ${e?.message ?? "Unknown"}`);
    } finally {
      setSaving(false);
    }
  }

  function startNew() {
    setDraft(EMPTY_DRAFT());
    setCustomer(null);
    setSaved(null);
    setShowPreview(false);
    setShowHistory(false);
  }

  const summary    = computeSummary(draft.items, draft.discount, draft.tax_rate);
  const nextBillNo = `BILL-${billCounter}`;

  // ── Sub-renders ────────────────────────────────────────────

  function CustomerBadge() {
    if (!customer) return null;
    const initials = customer.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "rgba(192,57,43,0.06)", borderRadius: 12,
        padding: "8px 12px", marginBottom: 10,
        border: `1px solid rgba(192,57,43,0.20)`,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%", background: BRAND,
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, flexShrink: 0,
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: BRAND, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {customer.name}
          </div>
          <div style={{ fontSize: 11, color: COLOR.textSoft }}>{customer.phone}</div>
        </div>
        <button
          onClick={() => { setCustomer(null); setDraft(d => ({ ...d, customer_id: null, customer_name: "", customer_phone: "" })); }}
          style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: COLOR.textFaint, lineHeight: 1 }}
          aria-label="Clear customer"
        >✕</button>
      </div>
    );
  }

  function SummaryRows() {
    return (
      <>
        {[
          { l: "Subtotal",              v: `₹${summary.subtotal.toFixed(2)}` },
          draft.discount > 0 ? { l: "Discount", v: `-₹${summary.discount.toFixed(2)}` } : null,
          { l: `GST ${draft.tax_rate}%`, v: `₹${summary.tax_amount.toFixed(2)}` },
        ].filter(Boolean).map((r, i) => r && (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLOR.textSoft, marginBottom: 4 }}>
            <span>{r.l}</span><span>{r.v}</span>
          </div>
        ))}
        <div style={{
          display: "flex", justifyContent: "space-between",
          fontSize: 17, fontWeight: 800, color: COLOR.text,
          borderTop: "1.5px solid rgba(0,0,0,0.09)", paddingTop: 8, marginTop: 4,
        }}>
          <span>Total</span>
          <span style={{ color: BRAND }}>₹{summary.total.toFixed(2)}</span>
        </div>
      </>
    );
  }

  // ── Saved screen ───────────────────────────────────────────

  if (saved) {
    return (
      <>
        <style>{GLOBAL_STYLES}</style>
        <style>{RESPONSIVE_STYLES}</style>
        <div className="bl-saved-screen">
          <div style={{ width: "100%", maxWidth: 460 }}>
            {/* Success header */}
            <div style={{
              textAlign: "center", marginBottom: 24,
              background: "rgba(255,255,255,0.60)", backdropFilter: "blur(16px)",
              borderRadius: 20, padding: "24px 20px",
              border: "1px solid rgba(255,255,255,0.70)",
            }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: COLOR.text, margin: "0 0 4px" }}>
                Bill Saved!
              </h2>
              <p style={{ fontSize: 13, color: COLOR.textSoft, margin: 0 }}>
                {saved.bill_number} · {saved.customer_name || "Walk-in"} · <strong style={{ color: BRAND }}>₹{saved.total.toFixed(2)}</strong>
              </p>
            </div>

            <BillPreview
              draft={draft}
              billNumber={saved.bill_number}
              shopName={shopName}
              shopGst={shopGst}
              shopAddress={shopAddr}
            />

            {/* Action buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 20 }}>
              {[
                { label: "🖨 Print",     action: () => window.print() },
                { label: "💬 WhatsApp",  action: () => {
                    const tel = saved.customer_phone.replace(/\D/g, "");
                    window.open(`https://wa.me/${tel}?text=Your bill ${saved.bill_number} · ₹${saved.total.toFixed(2)}`, "_blank");
                  }
                },
                { label: "+ New Bill",   action: startNew, primary: true },
              ].map(btn => (
                <button
                  key={btn.label}
                  onClick={btn.action}
                  className={(btn as any).primary ? "iv-btn-primary" : "iv-btn-ghost"}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Main form content (shared across breakpoints) ──────────

  function FormContent() {
    return (
      <>
        {/* ── Customer ── */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.40)" }}>
          <div className="bl-section-label">Customer</div>

          <button
            className="iv-btn-ghost"
            style={{ width: "100%", marginBottom: 10, textAlign: "center", fontSize: 13 }}
            onClick={() => setShowQR(true)}
          >
            📷 Scan Customer QR
          </button>

          <CustomerBadge />

          <input
            className="iv-input"
            placeholder="Customer name (optional)"
            value={draft.customer_name}
            onChange={e => setDraft(d => ({ ...d, customer_name: e.target.value }))}
            style={{ marginBottom: 8 }}
          />

          <div style={{ position: "relative" }}>
            <input
              className="iv-input"
              placeholder="Mobile number"
              value={draft.customer_phone}
              onChange={e => void handlePhoneInput(e.target.value)}
              inputMode="numeric"
            />
            {suggestions.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)",
                borderRadius: 12, overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.65)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                marginTop: 4,
              }}>
                {suggestions.map(c => (
                  <div key={c.id} className="bl-suggestion-item" onClick={() => applyCustomer(c)}>
                    <span style={{ fontWeight: 600, color: COLOR.text }}>{c.name}</span>
                    <span style={{ color: COLOR.textSoft, marginLeft: 6 }}>{c.phone}</span>
                    {c.loyalty_pts > 0 && (
                      <span style={{ float: "right", fontSize: 11, color: "#15803d" }}>⭐ {c.loyalty_pts} pts</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Items ── */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.40)", flex: 1 }}>
          <div className="bl-section-label">Items</div>

          {/* Add bar */}
          <div className="bl-add-bar">
            <input
              ref={nameRef}
              className="iv-input" placeholder="Item name"
              value={iName} onChange={e => setIName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") priceRef.current?.focus(); }}
            />
            <input
              className="iv-input" type="number" placeholder="Qty"
              value={iQty} onChange={e => setIQty(Math.max(1, Number(e.target.value)))}
              min={1} style={{ textAlign: "center" }}
            />
            <input
              ref={priceRef}
              className="iv-input" type="number" placeholder="₹"
              value={iPrice}
              onChange={e => setIPrice(e.target.value === "" ? "" : Number(e.target.value))}
              min={0} inputMode="decimal"
              onKeyDown={e => { if (e.key === "Enter") addItem(); }}
            />
            <button
              className="iv-btn-primary"
              onClick={addItem}
              style={{ whiteSpace: "nowrap", padding: "9px 12px", fontSize: 13 }}
            >
              + Add
            </button>
          </div>

          {/* Items list */}
          {draft.items.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "20px 0", color: COLOR.textFaint,
              fontSize: 13, border: "1.5px dashed rgba(0,0,0,0.10)",
              borderRadius: 12, marginTop: 4,
            }}>
              No items yet — add something above
            </div>
          ) : draft.items.map((it, i) => (
            <div key={i} className="bl-item-row">
              {/* Name + unit price */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLOR.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {it.name}
                </div>
                <div style={{ fontSize: 11, color: COLOR.textFaint }}>₹{it.unit_price} each</div>
              </div>

              {/* Qty stepper */}
              <div className="bl-qty-stepper">
                <button className="bl-qty-btn" onClick={() => stepQty(i, -1)} aria-label="Decrease">−</button>
                <input
                  className="bl-qty-input"
                  type="number" min={1} value={it.quantity}
                  onChange={e => setQty(i, Number(e.target.value))}
                />
                <button className="bl-qty-btn" onClick={() => stepQty(i, +1)} aria-label="Increase">+</button>
              </div>

              {/* Line total */}
              <div style={{ fontSize: 13, fontWeight: 700, color: BRAND, minWidth: 60, textAlign: "right" }}>
                ₹{(it.unit_price * it.quantity).toFixed(0)}
              </div>

              {/* Remove */}
              <button
                onClick={() => removeItem(i)}
                style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: COLOR.textFaint, padding: "0 2px", lineHeight: 1 }}
                aria-label="Remove item"
              >✕</button>
            </div>
          ))}
        </div>

        {/* ── Discount + GST + Payment ── */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.40)" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: COLOR.textSoft, marginBottom: 4 }}>Discount (₹)</div>
              <input
                className="iv-input" type="number" min={0} value={draft.discount}
                onChange={e => setDraft(d => ({ ...d, discount: Number(e.target.value) }))}
                inputMode="decimal"
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: COLOR.textSoft, marginBottom: 4 }}>GST (%)</div>
              <input
                className="iv-input" type="number" min={0} value={draft.tax_rate}
                onChange={e => setDraft(d => ({ ...d, tax_rate: Number(e.target.value) }))}
                inputMode="decimal"
              />
            </div>
          </div>

          <div style={{ fontSize: 11, color: COLOR.textSoft, marginBottom: 6 }}>Payment mode</div>
          <div style={{ display: "flex", gap: 6 }}>
            {PAYMENT_MODES.map(pm => (
              <button
                key={pm.value}
                className={`bl-pay-btn${draft.payment_mode === pm.value ? " active" : ""}`}
                onClick={() => setDraft(d => ({ ...d, payment_mode: pm.value }))}
              >
                {pm.icon} {pm.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Summary + save (desktop/tablet only — mobile uses bottom bar) ── */}
        <div className="bl-no-print" style={{ padding: "12px 16px" }}>
          <SummaryRows />
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="iv-btn-ghost" style={{ flex: 1 }} onClick={startNew}>Clear</button>
            <button
              className="iv-btn-primary" style={{ flex: 2 }}
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? "Saving…" : "💾 Save & Print"}
            </button>
          </div>
        </div>
      </>
    );
  }

  function HistoryContent() {
    return (
      <div className="bl-history-panel">
        {recentBills.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: COLOR.textSoft, fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🧾</div>
            No bills yet
          </div>
        ) : recentBills.map(b => (
          <div key={b.id} className="bl-history-card">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.text }}>{b.bill_number}</div>
              <div style={{ fontSize: 11, color: COLOR.textSoft, marginTop: 1 }}>
                {b.customer_name || "Walk-in"} · {b.payment_mode.toUpperCase()}
              </div>
              <div style={{ fontSize: 10, color: COLOR.textFaint, marginTop: 1 }}>
                {new Date(b.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: BRAND }}>₹{b.total.toFixed(2)}</div>
              <span style={{
                display: "inline-block", marginTop: 3,
                fontSize: 9, padding: "2px 7px", borderRadius: 99,
                background: b.status === "paid" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                color: b.status === "paid" ? "#15803d" : "#b91c1c",
                fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
              }}>
                {b.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <style>{RESPONSIVE_STYLES}</style>

      {/* QR scanner modal */}
      {showQR && <QRScanner onResult={handleQrResult} onClose={() => setShowQR(false)} />}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: "#1a1a1a", color: "#fff", padding: "10px 20px",
          borderRadius: RADIUS.pill, fontSize: 13, zIndex: 999,
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)", whiteSpace: "nowrap",
          animation: "fadeIn 0.2s ease",
        }}>
          {toast}
        </div>
      )}

      {/* ── Mobile: preview sheet ── */}
      {showPreview && (
        <div className="bl-preview-sheet bl-no-print">
          {/* Sheet header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLOR.text }}>Bill Preview</div>
            <button
              onClick={() => setShowPreview(false)}
              style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: COLOR.textSoft }}
            >✕</button>
          </div>
          <BillPreview draft={draft} billNumber={nextBillNo} shopName={shopName} shopGst={shopGst} shopAddress={shopAddr} />
        </div>
      )}

      <div className="bl-root">

        {/* ════════ MOBILE TAB BAR ════════ */}
        <div className="bl-tab-bar bl-no-print">
          {/* Left: bill number */}
          <div style={{ fontSize: 12, fontWeight: 700, color: COLOR.text, minWidth: 0 }}>
            <span style={{ color: COLOR.textFaint, fontWeight: 400, fontSize: 10 }}>Bill </span>
            {nextBillNo}
          </div>

          {/* Center: tab buttons */}
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { label: "📝 Form",    active: !showHistory, action: () => setShowHistory(false) },
              { label: "🕐 History", active: showHistory,  action: () => setShowHistory(true)  },
            ].map(t => (
              <button
                key={t.label}
                onClick={t.action}
                style={{
                  fontSize: 11, fontWeight: 600, padding: "5px 10px",
                  borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                  border: t.active ? `1.5px solid ${BRAND}` : "1.5px solid transparent",
                  background: t.active ? "rgba(192,57,43,0.09)" : "transparent",
                  color: t.active ? BRAND : COLOR.textMid,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Right: preview button */}
          <button
            onClick={() => setShowPreview(true)}
            style={{
              fontSize: 11, fontWeight: 600, padding: "5px 10px",
              borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
              border: "1.5px solid rgba(255,255,255,0.65)",
              background: "rgba(255,255,255,0.50)",
              color: COLOR.textMid,
            }}
          >
            👁 Preview
          </button>
        </div>

        {/* ════════ LEFT PANEL (form / history) ════════ */}
        <div className="bl-form-panel bl-no-print">

          {/* Desktop/tablet header */}
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.45)" }}
               className="bl-no-print">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: COLOR.text, margin: 0 }}>New Bill</h2>
                <div style={{ fontSize: 11, color: COLOR.textSoft, marginTop: 2 }}>{nextBillNo}</div>
              </div>
              <button
                className="iv-btn-ghost"
                style={{ fontSize: 12 }}
                onClick={() => setShowHistory(h => !h)}
              >
                {showHistory ? "📝 New bill" : "🕐 History"}
              </button>
            </div>
          </div>

          {showHistory ? <HistoryContent /> : <FormContent />}
        </div>

        {/* ════════ RIGHT PANEL (desktop/tablet preview) ════════ */}
        <div className="bl-preview-panel bl-no-print">
          <div style={{ fontSize: 11, color: COLOR.textSoft, fontWeight: 500, marginBottom: -4 }}>
            LIVE PREVIEW
          </div>
          <BillPreview
            draft={draft}
            billNumber={nextBillNo}
            shopName={shopName}
            shopGst={shopGst}
            shopAddress={shopAddr}
          />
        </div>

        {/* ════════ MOBILE BOTTOM BAR ════════ */}
        <div className="bl-bottom-bar bl-no-print">
          {/* Mini summary */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: COLOR.textSoft }}>
              {draft.items.length} item{draft.items.length !== 1 ? "s" : ""}
              {draft.discount > 0 && <span style={{ color: "#15803d" }}> · -₹{draft.discount}</span>}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: BRAND }}>
              ₹{summary.total.toFixed(2)}
            </div>
          </div>

          {/* Clear */}
          <button
            className="iv-btn-ghost"
            style={{ flexShrink: 0, padding: "10px 14px", fontSize: 13 }}
            onClick={startNew}
          >
            Clear
          </button>

          {/* Save */}
          <button
            className="iv-btn-primary"
            style={{ flexShrink: 0, padding: "11px 20px", fontSize: 14, fontWeight: 700 }}
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? "Saving…" : "💾 Save"}
          </button>
        </div>

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(6px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>
    </>
  );
}
