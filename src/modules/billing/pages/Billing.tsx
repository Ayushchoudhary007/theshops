// src/modules/billing/pages/Billing.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { BRAND, RADIUS, COLOR, GLOBAL_STYLES } from "../../../design-tokens";
import { BillingService, computeSummary } from "../billing.service";
import { CustomerService } from "../../customers/customers.service";
import type { BillDraft, Bill } from "../billing.types";
import { PAYMENT_MODES } from "../billing.types";
import type { Customer } from "../../customers/customers.types";
import type { InventoryItem } from "../../inventory/pages/inventory.types";
import QRScanner from "../components/QRScanner";
import BillPreview from "../components/BillPreview";
import { query } from "../../../database";

const CSS = `
  .bl-root{display:flex;height:100vh;overflow:hidden;font-family:'Plus Jakarta Sans','Inter',sans-serif;
    background:linear-gradient(135deg,#fce4e4 0%,#fde8d8 20%,#fef9c3 40%,#dcfce7 60%,#dbeafe 80%,#ede9fe 100%);
    background-attachment:fixed;}
  .bl-left{width:400px;min-width:360px;display:flex;flex-direction:column;overflow-y:auto;
    border-right:1px solid rgba(255,255,255,0.55);background:rgba(255,255,255,0.52);
    backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);}
  .bl-left::-webkit-scrollbar{width:3px}
  .bl-left::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:3px}
  .bl-right{flex:1;overflow-y:auto;display:flex;flex-direction:column;align-items:center;padding:32px 20px;gap:16px;}
  .bl-section{font-size:10px;font-weight:800;color:${COLOR.textMid};text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;}
  .bl-item-row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,.05);animation:slideIn .18s ease;}
  @keyframes slideIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
  .bl-qty{display:flex;align-items:center;border:1px solid rgba(255,255,255,.7);border-radius:8px;overflow:hidden;background:rgba(255,255,255,.55);}
  .bl-qty-btn{width:26px;height:30px;background:none;border:none;cursor:pointer;font-size:14px;color:${COLOR.textMid};display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .bl-qty-btn:hover{background:rgba(192,57,43,.08)}
  .bl-qty-inp{width:34px;text-align:center;border:none;background:none;font-size:13px;font-family:inherit;color:${COLOR.text};padding:0;outline:none;-moz-appearance:textfield;}
  .bl-qty-inp::-webkit-outer-spin-button,.bl-qty-inp::-webkit-inner-spin-button{-webkit-appearance:none}
  .bl-pay-btn{flex:1;padding:9px 4px;font-size:12px;font-weight:600;border-radius:10px;cursor:pointer;font-family:inherit;
    transition:all .15s;border:1.5px solid rgba(255,255,255,.65);background:rgba(255,255,255,.45);color:${COLOR.textMid};}
  .bl-pay-btn.on{border-color:${BRAND};background:rgba(192,57,43,.10);color:${BRAND};box-shadow:0 2px 8px rgba(192,57,43,.15);}
  .bl-drop{position:absolute;top:100%;left:0;right:0;z-index:60;background:rgba(255,255,255,.98);
    backdrop-filter:blur(20px);border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.65);
    box-shadow:0 12px 32px rgba(0,0,0,.12);margin-top:4px;max-height:280px;overflow-y:auto;}
  .bl-drop-hdr{padding:7px 14px;background:rgba(192,57,43,.05);border-bottom:1px solid rgba(0,0,0,.06);
    font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:${COLOR.textSoft};
    display:flex;align-items:center;justify-content:space-between;}
  .bl-drop-row{padding:9px 14px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.35);
    transition:background .1s;display:flex;align-items:center;gap:8px;}
  .bl-drop-row:hover{background:rgba(192,57,43,.06)}
  .bl-drop-row:last-child{border-bottom:none}
  .bl-thumb{width:32px;height:32px;border-radius:8px;background:rgba(0,0,0,.04);flex-shrink:0;
    display:flex;align-items:center;justify-content:center;font-size:16px;overflow:hidden;}
  .bl-hist-card{border-radius:12px;padding:11px 14px;margin-bottom:8px;display:flex;
    justify-content:space-between;align-items:center;background:rgba(255,255,255,.52);
    backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.65);cursor:pointer;
    transition:box-shadow .15s,transform .15s;}
  .bl-hist-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.08);transform:translateY(-1px)}
  .bl-tab-bar{display:none}
  .bl-bottom-bar{display:none}
  .bl-mobile-sheet{display:none}
  @media(max-width:767px){
    .bl-root{flex-direction:column;height:100dvh;}
    .bl-left{width:100%;min-width:unset;flex:1;border-right:none;border-bottom:1px solid rgba(255,255,255,.45);padding-bottom:70px;padding-top:56px;}
    .bl-right{display:none}
    .bl-tab-bar{display:flex;position:fixed;top:0;left:0;right:0;z-index:200;
      background:rgba(255,255,255,.82);backdrop-filter:blur(20px);
      border-bottom:1px solid rgba(255,255,255,.55);padding:0 12px;height:52px;
      align-items:center;justify-content:space-between;gap:8px;}
    .bl-bottom-bar{display:flex;position:fixed;bottom:0;left:0;right:0;z-index:200;
      background:rgba(255,255,255,.88);backdrop-filter:blur(20px);
      border-top:1px solid rgba(255,255,255,.55);padding:10px 16px;gap:10px;align-items:center;}
    .bl-mobile-sheet{display:block;position:fixed;inset:0;z-index:300;
      background:linear-gradient(135deg,#fce4e4 0%,#fde8d8 20%,#fef9c3 40%,#dcfce7 60%,#dbeafe 80%,#ede9fe 100%);
      overflow-y:auto;padding:16px 16px 120px;animation:sheetUp .28s cubic-bezier(.32,.72,0,1);}
    @keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
  }
  @media print{.bl-noprint{display:none!important}}
`;

const EMPTY_DRAFT = (): BillDraft => ({
  customer_id: null, customer_name: "", customer_phone: "",
  items: [], discount: 0, tax_rate: 18, payment_mode: "cash", notes: "",
});

export default function Billing() {
  // ── State ───────────────────────────────────────────────────
  const [draft,        setDraft]        = useState<BillDraft>(EMPTY_DRAFT());
  const [customer,     setCustomer]     = useState<Customer | null>(null);
  const [recentBills,  setRecentBills]  = useState<Bill[]>([]);
  const [shopName,     setShopName]     = useState("My Shop");
  const [shopGst,      setShopGst]      = useState("");
  const [shopAddr,     setShopAddr]     = useState("");
  const [billCounter,  setBillCounter]  = useState(1001);
  const [iName,        setIName]        = useState("");
  const [iQty,         setIQty]         = useState(1);
  const [iPrice,       setIPrice]       = useState<number | "">("");
  const [selectedInv,  setSelectedInv]  = useState<InventoryItem | null>(null);
  const [invSuggs,     setInvSuggs]     = useState<InventoryItem[]>([]);
  const [invLoading,   setInvLoading]   = useState(false);
  const [custSuggs,    setCustSuggs]    = useState<Customer[]>([]);
  const [showQR,       setShowQR]       = useState(false);
  const [showHistory,  setShowHistory]  = useState(false);
  const [showPreview,  setShowPreview]  = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState<Bill | null>(null);
  const [toast,        setToast]        = useState<string | null>(null);

  const nameRef    = useRef<HTMLInputElement>(null);
  const priceRef   = useRef<HTMLInputElement>(null);
  const invTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Data ─────────────────────────────────────────────────────
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

  // ── Helpers ──────────────────────────────────────────────────
  const toast_ = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const nextBillNo = `BILL-${billCounter}`;
  const summary    = computeSummary(draft.items, draft.discount, draft.tax_rate);

  // ── Inventory search ─────────────────────────────────────────
  const searchInv = useCallback(async (term: string) => {
    if (!term.trim()) { setInvSuggs([]); return; }
    setInvLoading(true);
    try {
      const rows = await query<InventoryItem>(
        `SELECT * FROM inventory
         WHERE (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)
           AND status != 'out-of-stock'
         ORDER BY name ASC LIMIT 8`,
        [`%${term}%`, `%${term}%`, `%${term}%`]
      );
      setInvSuggs(rows);
    } catch { setInvSuggs([]); }
    finally   { setInvLoading(false); }
  }, []);

  const onNameChange = useCallback((val: string) => {
    setIName(val);
    setSelectedInv(null);
    if (invTimer.current) clearTimeout(invTimer.current);
    if (!val.trim()) { setInvSuggs([]); return; }
    invTimer.current = setTimeout(() => void searchInv(val), 150);
  }, [searchInv]);

  const pickInvItem = useCallback((item: InventoryItem) => {
    setIName(item.name);
    setIPrice(item.price);
    setSelectedInv(item);
    setInvSuggs([]);
    setTimeout(() => priceRef.current?.focus(), 50);
  }, []);

  // ── Customer ──────────────────────────────────────────────────
  const pickCustomer = useCallback((c: Customer) => {
    setCustomer(c);
    setDraft(d => ({ ...d, customer_id: c.id, customer_name: c.name, customer_phone: c.phone }));
    setCustSuggs([]);
  }, []);

  const onPhoneChange = useCallback(async (val: string) => {
    setDraft(d => ({ ...d, customer_phone: val, customer_id: null }));
    setCustomer(null);
    if (val.length >= 6) {
      const rows = await query<Customer>(
        "SELECT * FROM customers WHERE phone LIKE ? LIMIT 5", [`${val}%`]
      );
      setCustSuggs(rows);
      // Auto-match exact phone
      const exact = rows.find(r => r.phone === val);
      if (exact) pickCustomer(exact);
    } else {
      setCustSuggs([]);
    }
  }, [pickCustomer]);

  const onQrResult = useCallback(async (raw: string) => {
    setShowQR(false);
    const parsed = CustomerService.parseQrPayload(raw);
    if (!parsed) { toast_("Could not read QR data"); return; }
    let found: Customer | null = null;
    if (parsed.phone) found = await CustomerService.findByPhone(parsed.phone);
    if (!found && parsed.name) found = await CustomerService.findByQrToken(raw);
    if (found) { pickCustomer(found); toast_(`Customer: ${found.name}`); }
    else {
      setDraft(d => ({ ...d, customer_id: null, customer_name: parsed.name, customer_phone: parsed.phone }));
      toast_("New customer — details pre-filled");
    }
  }, [pickCustomer]);

  // ── Items ─────────────────────────────────────────────────────
  const addItem = useCallback(() => {
    if (!iName.trim() || !iPrice) { toast_("Enter item name and price"); return; }
    if (selectedInv && selectedInv.stock < iQty) toast_(`⚠ Only ${selectedInv.stock} in stock`);
    setDraft(d => ({
      ...d,
      items: [...d.items, {
        name:         iName.trim(),
        sku:          selectedInv?.sku ?? "",
        quantity:     iQty,
        unit_price:   Number(iPrice),
        total_price:  iQty * Number(iPrice),
        inventory_id: selectedInv?.id ?? null,
      }],
    }));
    setIName(""); setIQty(1); setIPrice(""); setSelectedInv(null); setInvSuggs([]);
    setTimeout(() => nameRef.current?.focus(), 50);
  }, [iName, iPrice, iQty, selectedInv]);

  const removeItem = useCallback((i: number) =>
    setDraft(d => ({ ...d, items: d.items.filter((_, idx) => idx !== i) })), []);

  const stepQty = useCallback((i: number, delta: number) =>
    setDraft(d => ({
      ...d,
      items: d.items.map((it, idx) => {
        if (idx !== i) return it;
        const qty = Math.max(1, it.quantity + delta);
        return { ...it, quantity: qty, total_price: qty * it.unit_price };
      }),
    })), []);

  const setItemQty = useCallback((i: number, qty: number) => {
    if (qty < 1) return;
    setDraft(d => ({
      ...d,
      items: d.items.map((it, idx) =>
        idx === i ? { ...it, quantity: qty, total_price: qty * it.unit_price } : it
      ),
    }));
  }, []);

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!draft.items.length) { toast_("Add at least one item"); return; }
    setSaving(true);
    try {
      const bill = await BillingService.create(draft);
      setSaved(bill);
      await Promise.all([loadRecent(), loadMeta()]);
      toast_(`Bill ${bill.bill_number} created!`);
    } catch (e: any) {
      toast_(`Error: ${e?.message ?? "Unknown"}`);
    } finally {
      setSaving(false);
    }
  }, [draft, loadMeta, loadRecent]);

  const startNew = useCallback(() => {
    setDraft(EMPTY_DRAFT()); setCustomer(null); setSaved(null);
    setShowPreview(false); setShowHistory(false);
    setInvSuggs([]); setSelectedInv(null);
    setIName(""); setIQty(1); setIPrice("");
  }, []);

  // ── Sub-components (defined OUTSIDE render, stable references) ─

  // Customer badge — shown when customer is linked
  const CustomerBadge = customer ? (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "rgba(192,57,43,.06)", borderRadius: 12,
      padding: "8px 12px", marginBottom: 10,
      border: `1px solid rgba(192,57,43,.20)`,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: "50%", background: BRAND,
        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 700, flexShrink: 0,
      }}>
        {customer.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: BRAND, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {customer.name}
        </div>
        <div style={{ fontSize: 11, color: COLOR.textSoft }}>{customer.phone}</div>
      </div>
      <button
        onClick={() => { setCustomer(null); setDraft(d => ({ ...d, customer_id: null, customer_name: "", customer_phone: "" })); }}
        style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: COLOR.textFaint, lineHeight: 1 }}
      >✕</button>
    </div>
  ) : null;

  // Summary rows
  const SummaryRows = (
    <div>
      {[
        { l: "Subtotal", v: `₹${summary.subtotal.toFixed(2)}` },
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
        borderTop: "1.5px solid rgba(0,0,0,.09)", paddingTop: 8, marginTop: 4,
      }}>
        <span>Total</span>
        <span style={{ color: BRAND }}>₹{summary.total.toFixed(2)}</span>
      </div>
    </div>
  );

  // ── Saved screen ──────────────────────────────────────────────
  if (saved) {
    return (
      <>
        <style>{GLOBAL_STYLES}</style>
        <style>{CSS}</style>
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "flex-start",
          justifyContent: "center", padding: "40px 16px 100px",
          background: "linear-gradient(135deg,#fce4e4 0%,#fde8d8 20%,#fef9c3 40%,#dcfce7 60%,#dbeafe 80%,#ede9fe 100%)",
        }}>
          <div style={{ width: "100%", maxWidth: 460 }}>
            <div style={{
              textAlign: "center", marginBottom: 24, padding: "24px 20px",
              background: "rgba(255,255,255,.60)", backdropFilter: "blur(16px)",
              borderRadius: 20, border: "1px solid rgba(255,255,255,.70)",
            }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: COLOR.text, margin: "0 0 4px" }}>Bill Saved!</h2>
              <p style={{ fontSize: 13, color: COLOR.textSoft, margin: 0 }}>
                {saved.bill_number} · {saved.customer_name || "Walk-in"} · <strong style={{ color: BRAND }}>₹{saved.total.toFixed(2)}</strong>
              </p>
            </div>
            <BillPreview draft={draft} billNumber={saved.bill_number} shopName={shopName} shopGst={shopGst} shopAddress={shopAddr} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 20 }}>
              <button className="iv-btn-ghost" onClick={() => window.print()}>🖨 Print</button>
              <button className="iv-btn-ghost" onClick={() => {
                const tel = saved.customer_phone?.replace(/\D/g, "");
                if (tel) window.open(`https://wa.me/${tel}?text=Your bill ${saved.bill_number} · ₹${saved.total.toFixed(2)}`, "_blank");
                else toast_("No customer phone number");
              }}>💬 WhatsApp</button>
              <button className="iv-btn-primary" onClick={startNew}>+ New Bill</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Form panel ────────────────────────────────────────────────
  const FormPanel = (
    <>
      {/* Customer section */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.40)" }}>
        <div className="bl-section">Customer</div>
        <button className="iv-btn-ghost" style={{ width: "100%", marginBottom: 10, fontSize: 13, textAlign: "center" }} onClick={() => setShowQR(true)}>
          📷 Scan Customer QR
        </button>
        {CustomerBadge}
        <input className="iv-input" placeholder="Customer name (optional)"
          value={draft.customer_name}
          onChange={e => setDraft(d => ({ ...d, customer_name: e.target.value }))}
          style={{ marginBottom: 8 }} />

        {/* Phone with auto-match */}
        <div style={{ position: "relative" }}>
          <input className="iv-input" placeholder="Mobile number — type to search customers"
            value={draft.customer_phone}
            onChange={e => void onPhoneChange(e.target.value)}
            inputMode="numeric" />
          {custSuggs.length > 0 && !customer && (
            <div className="bl-drop">
              <div className="bl-drop-hdr">
                <span>📋 Matching customers</span>
                <span style={{ fontSize: 10, color: COLOR.textFaint }}>Click to link</span>
              </div>
              {custSuggs.map(c => (
                <div key={c.id} className="bl-drop-row" onClick={() => pickCustomer(c)}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: BRAND, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLOR.text }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: COLOR.textSoft }}>{c.phone}</div>
                  </div>
                  {c.loyalty_pts > 0 && <span style={{ fontSize: 11, color: "#15803d" }}>⭐ {c.loyalty_pts}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Items section */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.40)", flex: 1 }}>
        <div className="bl-section">Items</div>

        {/* Name with inventory search */}
        <div style={{ position: "relative", marginBottom: 6 }}>
          <input ref={nameRef} className="iv-input"
            placeholder="🔍 Search inventory or type item name…"
            value={iName}
            onChange={e => onNameChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                if (invSuggs.length > 0) pickInvItem(invSuggs[0]);
                else priceRef.current?.focus();
              }
              if (e.key === "Escape") setInvSuggs([]);
            }}
            autoComplete="off"
          />

          {(invSuggs.length > 0 || (invLoading && iName.length > 0)) && (
            <div className="bl-drop">
              <div className="bl-drop-hdr">
                <span>📦 Inventory matches</span>
                <span style={{ fontSize: 10, color: COLOR.textFaint }}>Enter = first · Esc = close</span>
              </div>
              {invLoading ? (
                <div style={{ padding: 14, textAlign: "center", color: COLOR.textFaint, fontSize: 13 }}>Searching…</div>
              ) : invSuggs.map(item => (
                <div key={item.id} className="bl-drop-row" onClick={() => pickInvItem(item)}>
                  <div className="bl-thumb">
                    {item.image
                      ? <img src={item.image} alt={item.name} style={{ width: 32, height: 32, objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      : "📦"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLOR.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: COLOR.textSoft, display: "flex", gap: 8 }}>
                      {item.brand && <span>{item.brand}</span>}
                      {item.sku   && <span>SKU: {item.sku}</span>}
                      <span style={{ color: item.status === "in-stock" ? "#15803d" : item.status === "low-stock" ? "#b45309" : "#b91c1c", fontWeight: 600 }}>
                        {item.stock} in stock
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: BRAND, flexShrink: 0 }}>₹{item.price.toLocaleString("en-IN")}</div>
                </div>
              ))}
              {iName.trim() && (
                <div style={{ padding: "9px 14px", cursor: "pointer", borderTop: invSuggs.length > 0 ? "1px solid rgba(0,0,0,.06)" : "none", background: "rgba(0,0,0,.02)", fontSize: 12, color: COLOR.textSoft, display: "flex", alignItems: "center", gap: 6 }}
                  onClick={() => { setInvSuggs([]); priceRef.current?.focus(); }}>
                  <span>✏️</span>
                  <span>Use <strong style={{ color: COLOR.text }}>"{iName}"</strong> as custom item</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Qty + Price + Add */}
        <div style={{ display: "grid", gridTemplateColumns: "52px 1fr auto", gap: 6, marginBottom: 10 }}>
          <input className="iv-input" type="number" placeholder="Qty" min={1}
            value={iQty} onChange={e => setIQty(Math.max(1, Number(e.target.value)))}
            style={{ textAlign: "center" }} />
          <input ref={priceRef} className="iv-input" type="number" placeholder="₹ Price" min={0}
            value={iPrice} onChange={e => setIPrice(e.target.value === "" ? "" : Number(e.target.value))}
            inputMode="decimal"
            onKeyDown={e => { if (e.key === "Enter") addItem(); }} />
          <button className="iv-btn-primary" onClick={addItem} style={{ whiteSpace: "nowrap", padding: "9px 14px", fontSize: 13 }}>
            + Add
          </button>
        </div>

        {/* Items list */}
        {draft.items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: COLOR.textFaint, fontSize: 13, border: "1.5px dashed rgba(0,0,0,.10)", borderRadius: 12 }}>
            Search inventory above or type an item name
          </div>
        ) : draft.items.map((it, i) => (
          <div key={i} className="bl-item-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLOR.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</div>
              <div style={{ fontSize: 11, color: COLOR.textFaint }}>₹{it.unit_price} each</div>
            </div>
            <div className="bl-qty">
              <button className="bl-qty-btn" onClick={() => stepQty(i, -1)}>−</button>
              <input className="bl-qty-inp" type="number" min={1} value={it.quantity}
                onChange={e => setItemQty(i, Number(e.target.value))} />
              <button className="bl-qty-btn" onClick={() => stepQty(i, +1)}>+</button>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: BRAND, minWidth: 60, textAlign: "right" }}>
              ₹{(it.unit_price * it.quantity).toFixed(0)}
            </div>
            <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: COLOR.textFaint, padding: "0 2px", lineHeight: 1 }}>✕</button>
          </div>
        ))}
      </div>

      {/* Discount + GST + Payment */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.40)" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: COLOR.textSoft, marginBottom: 4 }}>Discount (₹)</div>
            <input className="iv-input" type="number" min={0} value={draft.discount}
              onChange={e => setDraft(d => ({ ...d, discount: Number(e.target.value) }))} inputMode="decimal" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: COLOR.textSoft, marginBottom: 4 }}>GST (%)</div>
            <input className="iv-input" type="number" min={0} value={draft.tax_rate}
              onChange={e => setDraft(d => ({ ...d, tax_rate: Number(e.target.value) }))} inputMode="decimal" />
          </div>
        </div>
        <div style={{ fontSize: 11, color: COLOR.textSoft, marginBottom: 6 }}>Payment mode</div>
        <div style={{ display: "flex", gap: 6 }}>
          {PAYMENT_MODES.map(pm => (
            <button key={pm.value}
              className={`bl-pay-btn${draft.payment_mode === pm.value ? " on" : ""}`}
              onClick={() => setDraft(d => ({ ...d, payment_mode: pm.value }))}>
              {pm.icon} {pm.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary + Save */}
      <div className="bl-noprint" style={{ padding: "12px 16px" }}>
        {SummaryRows}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="iv-btn-ghost" style={{ flex: 1 }} onClick={startNew}>Clear</button>
          <button className="iv-btn-primary" style={{ flex: 2 }} onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "💾 Save & Print"}
          </button>
        </div>
      </div>
    </>
  );

  // ── History panel ─────────────────────────────────────────────
  const HistoryPanel = (
    <div style={{ padding: 12, overflowY: "auto" }}>
      {recentBills.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: COLOR.textSoft, fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🧾</div>No bills yet
        </div>
      ) : recentBills.map(b => (
        <div key={b.id} className="bl-hist-card">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.text }}>{b.bill_number}</div>
            <div style={{ fontSize: 11, color: COLOR.textSoft, marginTop: 1 }}>{b.customer_name || "Walk-in"} · {b.payment_mode.toUpperCase()}</div>
            <div style={{ fontSize: 10, color: COLOR.textFaint, marginTop: 1 }}>
              {new Date(b.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: BRAND }}>₹{b.total.toFixed(2)}</div>
            <span style={{
              display: "inline-block", marginTop: 3, fontSize: 9, padding: "2px 7px", borderRadius: 99,
              background: b.status === "paid" ? "rgba(34,197,94,.12)" : "rgba(239,68,68,.12)",
              color: b.status === "paid" ? "#15803d" : "#b91c1c", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em",
            }}>{b.status}</span>
          </div>
        </div>
      ))}
    </div>
  );

  // ── Main render ───────────────────────────────────────────────
  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <style>{CSS}</style>

      {showQR && <QRScanner onResult={onQrResult} onClose={() => setShowQR(false)} />}

      {toast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: "#1a1a1a", color: "#fff", padding: "10px 20px",
          borderRadius: RADIUS.pill, fontSize: 13, zIndex: 999,
          boxShadow: "0 4px 20px rgba(0,0,0,.25)", whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}

      {showPreview && (
        <div className="bl-mobile-sheet bl-noprint">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLOR.text }}>Bill Preview</div>
            <button onClick={() => setShowPreview(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: COLOR.textSoft }}>✕</button>
          </div>
          <BillPreview draft={draft} billNumber={nextBillNo} shopName={shopName} shopGst={shopGst} shopAddress={shopAddr} />
        </div>
      )}

      <div className="bl-root">
        {/* Mobile tab bar */}
        <div className="bl-tab-bar bl-noprint">
          <div style={{ fontSize: 12, fontWeight: 700, color: COLOR.text }}>
            <span style={{ color: COLOR.textFaint, fontWeight: 400, fontSize: 10 }}>Bill </span>{nextBillNo}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[{ label: "📝 Form", active: !showHistory, action: () => setShowHistory(false) },
              { label: "🕐 History", active: showHistory, action: () => setShowHistory(true) }].map(t => (
              <button key={t.label} onClick={t.action} style={{
                fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                border: t.active ? `1.5px solid ${BRAND}` : "1.5px solid transparent",
                background: t.active ? "rgba(192,57,43,.09)" : "transparent",
                color: t.active ? BRAND : COLOR.textMid,
              }}>{t.label}</button>
            ))}
          </div>
          <button onClick={() => setShowPreview(true)} style={{
            fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
            border: "1.5px solid rgba(255,255,255,.65)", background: "rgba(255,255,255,.50)", color: COLOR.textMid,
          }}>👁 Preview</button>
        </div>

        {/* Left panel — form or history */}
        <div className="bl-left bl-noprint">
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,.45)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: COLOR.text, margin: 0 }}>New Bill</h2>
                <div style={{ fontSize: 11, color: COLOR.textSoft, marginTop: 2 }}>{nextBillNo}</div>
              </div>
              <button className="iv-btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowHistory(h => !h)}>
                {showHistory ? "📝 New bill" : "🕐 History"}
              </button>
            </div>
          </div>
          {showHistory ? HistoryPanel : FormPanel}
        </div>

        {/* Right panel — live preview (desktop) */}
        <div className="bl-right bl-noprint">
          <div style={{ fontSize: 11, color: COLOR.textSoft, fontWeight: 500, marginBottom: -4 }}>LIVE PREVIEW</div>
          <BillPreview draft={draft} billNumber={nextBillNo} shopName={shopName} shopGst={shopGst} shopAddress={shopAddr} />
        </div>

        {/* Mobile bottom bar */}
        <div className="bl-bottom-bar bl-noprint">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: COLOR.textSoft }}>
              {draft.items.length} item{draft.items.length !== 1 ? "s" : ""}
              {draft.discount > 0 && <span style={{ color: "#15803d" }}> · -₹{draft.discount}</span>}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: BRAND }}>₹{summary.total.toFixed(2)}</div>
          </div>
          <button className="iv-btn-ghost" style={{ flexShrink: 0, padding: "10px 14px", fontSize: 13 }} onClick={startNew}>Clear</button>
          <button className="iv-btn-primary" style={{ flexShrink: 0, padding: "11px 20px", fontSize: 14, fontWeight: 700 }}
            onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "💾 Save"}
          </button>
        </div>
      </div>
    </>
  );
}
