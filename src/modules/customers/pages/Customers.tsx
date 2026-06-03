// src/modules/customers/pages/Customers.tsx

import { useState, useEffect, useCallback } from "react";
import { BRAND, GLASS, RADIUS, COLOR, GLOBAL_STYLES } from "../../../design-tokens";
import { CustomerService } from "../customers.service";
import type { Customer, CustomerDraft, CustomerRow } from "../customers.types";
import { query } from "../../../database";
import type { Bill } from "../../billing/billing.types";

const EMPTY_DRAFT = (): CustomerDraft => ({
  name: "", phone: "", email: "", address: "", gst_number: "", qr_token: null,
});

type Modal =
  | { type: "none" }
  | { type: "add" }
  | { type: "edit";     customer: Customer }
  | { type: "qr";      customer: Customer }
  | { type: "bills";   customer: Customer };

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function Customers() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [search,    setSearch]    = useState("");
  const [modal,     setModal]     = useState<Modal>({ type: "none" });
  const [draft,     setDraft]     = useState<CustomerDraft>(EMPTY_DRAFT());
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState<string | null>(null);
  const [custBills,   setCustBills]   = useState<Bill[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);

  const load = useCallback(async () => {
    const rows = await CustomerService.list();
    setCustomers(rows);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function openAdd() {
    setDraft(EMPTY_DRAFT());
    setModal({ type: "add" });
  }

  function openEdit(c: Customer) {
    setDraft({ name: c.name, phone: c.phone, email: c.email, address: c.address, gst_number: c.gst_number, qr_token: c.qr_token });
    setModal({ type: "edit", customer: c });
  }

  async function handleSave() {
    if (!draft.name.trim()) { showToast("Name is required"); return; }
    setSaving(true);
    try {
      if (modal.type === "add") {
        await CustomerService.add(draft);
        showToast("Customer added");
      } else if (modal.type === "edit") {
        await CustomerService.update(modal.customer.id, draft);
        showToast("Customer updated");
      }
      setModal({ type: "none" });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Customer) {
    if (!confirm(`Delete ${c.name}?`)) return;
    await CustomerService.delete(c.id);
    showToast("Deleted");
    await load();
  }

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  // ── QR display ──────────────────────────────────────────────────────────────
  function QrModal({ c }: { c: Customer }) {
    // Generate a simple QR-like display with the token
    const payload = JSON.stringify({ name: c.name, phone: c.phone });
    return (
      <div style={{ textAlign: "center", padding: 8 }}>
        <div style={{ fontSize: 12, color: COLOR.textSoft, marginBottom: 12 }}>
          Customer QR payload
        </div>
        {/* Visual QR placeholder — in production use a qrcode library */}
        <div style={{
          width: 200, height: 200, margin: "0 auto 12px",
          background: "#fff", border: "3px solid #000",
          borderRadius: 8, display: "flex", alignItems: "center",
          justifyContent: "center", flexDirection: "column", gap: 4,
          padding: 12, position: "relative",
        }}>
          {/* QR corner finder squares — all 3 positions */}
          {[
            { top: 8,    left: 8    },
            { top: 8,    right: 8   },
            { bottom: 8, left: 8   },
          ].map((pos, i) => (
            <div key={i} style={{
              position: "absolute", ...pos,
              width: 32, height: 32,
              border: "4px solid #000", borderRadius: 4,
            }}>
              <div style={{ width: 16, height: 16, background: "#000", borderRadius: 2, margin: 4 }} />
            </div>
          ))}
          <div style={{ fontSize: 28, marginTop: 12 }}>👤</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#000" }}>{c.name}</div>
          <div style={{ fontSize: 9, color: "#555" }}>{c.phone}</div>
        </div>
        <div style={{
          background: "rgba(0,0,0,0.05)", borderRadius: 8, padding: "8px 12px",
          fontSize: 11, fontFamily: "monospace", wordBreak: "break-all", color: COLOR.textMid,
          marginBottom: 8,
        }}>
          {payload}
        </div>
        <div style={{ fontSize: 11, color: COLOR.textSoft }}>
          Token: <code style={{ color: BRAND }}>{c.qr_token}</code>
        </div>
        <div style={{ fontSize: 11, color: COLOR.textFaint, marginTop: 6 }}>
          Print this QR and give to the customer.<br />
          Scanner will auto-fill name + mobile.
        </div>
      </div>
    );
  }

  // ── Form modal (JSX variable — not a nested function component) ──
  const isEdit = modal.type === "edit";
  const FormModal = (modal.type === "add" || modal.type === "edit") ? (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        ...GLASS, borderRadius: RADIUS.card,
        padding: 24, width: 420, maxWidth: "92vw",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: COLOR.text }}>
            {isEdit ? "Edit Customer" : "Add Customer"}
          </h3>
          <button onClick={() => setModal({ type: "none" })} style={{ fontSize: 20, background: "none", border: "none", cursor: "pointer" }}>✕</button>
        </div>

        {[
          { label: "Name *",    key: "name",       type: "text"  },
          { label: "Mobile",    key: "phone",      type: "tel"   },
          { label: "Email",     key: "email",      type: "email" },
          { label: "Address",   key: "address",    type: "text"  },
          { label: "GST No.",   key: "gst_number", type: "text"  },
        ].map(field => (
          <div key={field.key}>
            <div style={{ fontSize: 11, color: COLOR.textSoft, marginBottom: 4 }}>{field.label}</div>
            <input
              className="iv-input"
              type={field.type}
              value={(draft as any)[field.key]}
              onChange={e => setDraft(d => ({ ...d, [field.key]: e.target.value }))}
            />
          </div>
        ))}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button className="iv-btn-ghost"   style={{ flex: 1 }} onClick={() => setModal({ type: "none" })}>Cancel</button>
          <button className="iv-btn-primary" style={{ flex: 1 }} onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add customer"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <style>{`.cust-card:hover { background: rgba(255,255,255,0.65) !important; }`}</style>

      {FormModal}

      {modal.type === "bills" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ ...GLASS, borderRadius: RADIUS.card, padding: 24, width: 500, maxWidth: "95vw", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: COLOR.text, margin: 0 }}>
                  {modal.customer.name}'s Bills
                </h3>
                <div style={{ fontSize: 12, color: COLOR.textSoft, marginTop: 2 }}>{modal.customer.phone}</div>
              </div>
              <button onClick={() => setModal({ type: "none" })} style={{ fontSize: 20, background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {billsLoading ? (
                <div style={{ textAlign: "center", padding: 32, color: COLOR.textSoft }}>Loading bills…</div>
              ) : custBills.length === 0 ? (
                <div style={{ textAlign: "center", padding: 32, color: COLOR.textSoft }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🧾</div>
                  <div>No bills for this customer yet</div>
                </div>
              ) : (
                <>
                  {/* Summary bar */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                    {[
                      { l: "Total bills", v: custBills.length },
                      { l: "Total spent", v: `₹${custBills.reduce((s, b) => s + b.total, 0).toLocaleString("en-IN")}` },
                      { l: "Last visit",  v: new Date(custBills[0].createdAt).toLocaleDateString("en-IN") },
                    ].map(s => (
                      <div key={s.l} style={{ flex: 1, minWidth: 100, background: "rgba(255,255,255,0.45)", borderRadius: 10, padding: "8px 12px" }}>
                        <div style={{ fontSize: 10, color: COLOR.textSoft }}>{s.l}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: COLOR.text }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Bill list */}
                  {custBills.map(b => (
                    <div key={b.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 14px", borderRadius: 10, marginBottom: 6,
                      background: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.65)",
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.text }}>{b.bill_number}</div>
                        <div style={{ fontSize: 11, color: COLOR.textSoft }}>
                          {new Date(b.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          {" · "}{b.payment_mode.toUpperCase()}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: BRAND }}>₹{b.total.toFixed(2)}</div>
                        <span style={{
                          fontSize: 9, padding: "2px 7px", borderRadius: 99,
                          background: b.status === "paid" ? "rgba(34,197,94,.12)" : "rgba(239,68,68,.12)",
                          color: b.status === "paid" ? "#15803d" : "#b91c1c",
                          fontWeight: 700, textTransform: "uppercase",
                        }}>{b.status}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
            <button className="iv-btn-ghost" style={{ width: "100%", marginTop: 14 }} onClick={() => setModal({ type: "none" })}>Close</button>
          </div>
        </div>
      )}

      {modal.type === "qr" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.45)", display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ ...GLASS, borderRadius: RADIUS.card, padding: 24, width: 340, maxWidth: "92vw" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>{modal.customer.name}</h3>
              <button onClick={() => setModal({ type: "none" })} style={{ fontSize: 20, background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
            <QrModal c={modal.customer} />
            <button className="iv-btn-ghost" style={{ width: "100%", marginTop: 14 }} onClick={() => setModal({ type: "none" })}>Close</button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#1a1a1a", color: "#fff", padding: "10px 20px",
          borderRadius: RADIUS.pill, fontSize: 13, zIndex: 200,
        }}>
          {toast}
        </div>
      )}

      <div style={{
        minHeight: "100vh", padding: "24px 20px",
        fontFamily: "'Inter', sans-serif",
        background: "linear-gradient(135deg,#fce4e4 0%,#fde8d8 20%,#fef9c3 40%,#dcfce7 60%,#dbeafe 80%,#ede9fe 100%)",
        backgroundAttachment: "fixed",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: COLOR.text }}>Customers</h1>
            <div style={{ fontSize: 13, color: COLOR.textSoft }}>{filtered.length} contacts</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              className="iv-input" placeholder="🔍 Search name or phone…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: 220 }}
            />
            <button className="iv-btn-primary" onClick={openAdd}>+ Add customer</button>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { l: "Total customers", v: customers.length },
            { l: "Total revenue",   v: `₹${customers.reduce((s,c) => s + (c.total_spent ?? 0), 0).toLocaleString("en-IN")}` },
            { l: "Top spender",     v: customers.sort((a,b)=>(b.total_spent??0)-(a.total_spent??0))[0]?.name ?? "—" },
          ].map(s => (
            <div key={s.l} style={{
              ...GLASS, borderRadius: RADIUS.item, padding: "12px 18px", flex: 1, minWidth: 140,
            }}>
              <div style={{ fontSize: 11, color: COLOR.textSoft, marginBottom: 4 }}>{s.l}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLOR.text }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Customer grid */}
        {filtered.length === 0 ? (
          <div style={{
            ...GLASS, borderRadius: RADIUS.card,
            padding: 48, textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: COLOR.text, marginBottom: 4 }}>No customers yet</div>
            <div style={{ fontSize: 13, color: COLOR.textSoft, marginBottom: 16 }}>
              Add customers manually or scan their QR.
            </div>
            <button className="iv-btn-primary" onClick={openAdd}>+ Add first customer</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            {filtered.map(c => (
              <div key={c.id} className="cust-card" style={{
                ...GLASS, borderRadius: RADIUS.card, padding: "16px 18px",
                transition: "background 0.12s", cursor: "default",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: "50%", background: BRAND,
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 700, flexShrink: 0,
                  }}>
                    {initials(c.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: COLOR.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: COLOR.textSoft }}>{c.phone || "—"}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: BRAND }}>₹{Number(c.total_spent ?? 0).toLocaleString("en-IN")}</div>
                    <div style={{ fontSize: 10, color: COLOR.textFaint }}>{c.total_bills ?? 0} bills</div>
                  </div>
                </div>

                {c.loyalty_pts > 0 && (
                  <div style={{ fontSize: 11, color: "#a16207", background: "rgba(234,179,8,0.12)", borderRadius: RADIUS.badge, display: "inline-block", padding: "2px 8px", marginBottom: 8 }}>
                    ⭐ {c.loyalty_pts} pts
                  </div>
                )}

                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button className="iv-btn-ghost"  style={{ flex: 1, fontSize: 12, padding: "6px 10px" }} onClick={() => openEdit(c as unknown as Customer)}>Edit</button>
                  <button className="iv-btn-ghost"  style={{ flex: 1, fontSize: 12, padding: "6px 10px" }} onClick={() => setModal({ type: "qr", customer: c as unknown as Customer })}>QR</button>
                  <button className="iv-btn-ghost"  style={{ flex: 1, fontSize: 12, padding: "6px 10px" }} onClick={() => {
                    const cust = c as unknown as Customer;
                    setModal({ type: "bills", customer: cust });
                    void loadCustomerBills(cust.id);
                  }}>🧾 Bills</button>
                  <button className="iv-btn-danger" style={{ flex: 1, fontSize: 12, padding: "6px 10px" }} onClick={() => void handleDelete(c as unknown as Customer)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
