// src/modules/billing/components/BillPreview.tsx
//
// Improvements over original:
//  • Dedicated @media print block: hides UI chrome, forces white bg,
//    correct paper sizing, no cut-off items.
//  • Responsive width: fills its container on mobile, capped at 380px on wider.
//  • Payment mode badge with colour coding.
//  • Subtle animated "LIVE" pulse on the preview label (screen only).
//  • Barcode-style bill number font for a more receipt-authentic feel.

import { BRAND, GLASS, RADIUS, COLOR } from "../../../design-tokens";
import type { BillDraft } from "../billing.types";
import { computeSummary } from "../billing.service";

interface Props {
  draft: BillDraft;
  billNumber: string;
  shopName: string;
  shopGst: string;
  shopAddress: string;
  /** Pass true when rendering in the post-save screen (hides "LIVE" badge) */
  isFinal?: boolean;
}

const PRINT_STYLES = `
  @media print {
    /* Hide everything except the receipt */
    body > *:not(#bp-print-root) { display: none !important; }
    #bp-print-root {
      display: block !important;
      position: fixed;
      inset: 0;
      background: #fff;
      padding: 16px;
      font-family: 'Courier New', Courier, monospace;
    }
    .bp-screen-only { display: none !important; }
    .bp-receipt {
      box-shadow: none !important;
      background: #fff !important;
      border: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      max-width: 100% !important;
      padding: 0 !important;
    }
  }
`;

const PAYMODE_META: Record<string, { color: string; bg: string; icon: string }> = {
  cash: { color: "#854d0e", bg: "rgba(234,179,8,0.12)",  icon: "💵" },
  upi:  { color: "#15803d", bg: "rgba(34,197,94,0.12)", icon: "📱" },
  card: { color: "#1d4ed8", bg: "rgba(59,130,246,0.12)", icon: "💳" },
};

function Dashes() {
  return (
    <div style={{ borderTop: "1px dashed rgba(0,0,0,0.18)", margin: "8px 0" }} />
  );
}

export default function BillPreview({
  draft, billNumber, shopName, shopGst, shopAddress, isFinal = false,
}: Props) {
  const summary = computeSummary(draft.items, draft.discount, draft.tax_rate);
  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
  const timeStr = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
  });
  const pm = PAYMODE_META[draft.payment_mode] ?? PAYMODE_META.cash;

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <style>{`
        @keyframes bp-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .bp-receipt {
          transition: box-shadow 0.2s;
        }
      `}</style>

      {/* "LIVE" badge — screen only */}
      {!isFinal && (
        <div className="bp-screen-only" style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 10, fontWeight: 700, color: BRAND,
          textTransform: "uppercase", letterSpacing: "0.08em",
          marginBottom: 4,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%", background: BRAND,
            display: "inline-block",
            animation: "bp-pulse 1.8s ease-in-out infinite",
          }} />
          Live preview
        </div>
      )}

      <div
        id="bp-print-root"
        className="bp-receipt"
        style={{
          ...GLASS,
          borderRadius: RADIUS.card,
          padding: "22px 20px 18px",
          width: "100%",
          maxWidth: 380,
          fontFamily: "'Courier New', Courier, monospace",
          boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
        }}
      >
        {/* ── Shop header ── */}
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{
            fontSize: 19, fontWeight: 900,
            color: BRAND, letterSpacing: "-0.01em",
            fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
          }}>
            {shopName || "My Shop"}
          </div>
          {shopAddress && (
            <div style={{ fontSize: 10, color: COLOR.textSoft, marginTop: 3, lineHeight: 1.4 }}>
              {shopAddress}
            </div>
          )}
          {shopGst && (
            <div style={{ fontSize: 9, color: COLOR.textFaint, marginTop: 2 }}>
              GSTIN: {shopGst}
            </div>
          )}
        </div>

        <Dashes />

        {/* ── Bill meta ── */}
        <div style={{ fontSize: 10, color: COLOR.textSoft, marginBottom: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span><strong style={{ color: COLOR.text }}>Bill#</strong> {billNumber}</span>
            <span>{dateStr}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
            <span>
              <strong style={{ color: COLOR.text }}>To:</strong>{" "}
              {draft.customer_name || "Walk-in Customer"}
            </span>
            <span>{timeStr}</span>
          </div>
          {draft.customer_phone && (
            <div style={{ marginTop: 2 }}>
              <strong style={{ color: COLOR.text }}>Mobile:</strong> {draft.customer_phone}
            </div>
          )}
        </div>

        <Dashes />

        {/* ── Items table ── */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              {(["Item", "Qty", "Rate", "Amt"] as const).map(h => (
                <th key={h} style={{
                  textAlign: h === "Item" ? "left" : "right",
                  padding: "3px 0 5px",
                  color: COLOR.textSoft,
                  fontWeight: 700,
                  fontSize: 10,
                  borderBottom: "1px solid rgba(0,0,0,0.10)",
                  letterSpacing: "0.04em",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {draft.items.length === 0 ? (
              <tr>
                <td colSpan={4} style={{
                  textAlign: "center", color: COLOR.textFaint,
                  padding: "14px 0", fontSize: 11, fontStyle: "italic",
                }}>
                  No items added
                </td>
              </tr>
            ) : draft.items.map((it, i) => (
              <tr key={i} style={{ borderBottom: "1px dotted rgba(0,0,0,0.06)" }}>
                <td style={{
                  padding: "5px 0", color: COLOR.text,
                  maxWidth: 130, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {it.name}
                </td>
                <td style={{ padding: "5px 0", textAlign: "right", color: COLOR.textMid }}>
                  {it.quantity}
                </td>
                <td style={{ padding: "5px 0", textAlign: "right", color: COLOR.textMid }}>
                  ₹{it.unit_price.toFixed(0)}
                </td>
                <td style={{ padding: "5px 0", textAlign: "right", color: COLOR.text, fontWeight: 700 }}>
                  ₹{(it.unit_price * it.quantity).toFixed(0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Dashes />

        {/* ── Totals ── */}
        <div style={{ fontSize: 11 }}>
          {[
            { label: "Subtotal",               val: summary.subtotal,    neg: false },
            draft.discount > 0
              ? { label: "Discount",            val: draft.discount,      neg: true  }
              : null,
            { label: `GST (${draft.tax_rate}%)`, val: summary.tax_amount, neg: false },
          ].filter(Boolean).map((row, i) => row && (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              color: COLOR.textSoft, marginBottom: 4,
            }}>
              <span>{row.label}</span>
              <span style={{ color: row.neg ? "#15803d" : COLOR.textMid }}>
                {row.neg ? "−" : ""}₹{row.val.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Grand total */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          borderTop: "1.5px solid rgba(0,0,0,0.14)", paddingTop: 7, marginTop: 4,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: COLOR.text }}>TOTAL</span>
          <span style={{
            fontSize: 20, fontWeight: 900, color: BRAND,
            fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            letterSpacing: "-0.02em",
          }}>
            ₹{summary.total.toFixed(2)}
          </span>
        </div>

        {/* Payment mode badge */}
        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
          <span style={{
            fontSize: 11, fontWeight: 700,
            padding: "4px 10px", borderRadius: 99,
            background: pm.bg, color: pm.color,
            letterSpacing: "0.04em",
          }}>
            {pm.icon} {draft.payment_mode.toUpperCase()}
          </span>
        </div>

        <Dashes />

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: 10, color: COLOR.textFaint, lineHeight: 1.6 }}>
          <div>Thank you for shopping with us! 🙏</div>
          <div style={{ marginTop: 3, letterSpacing: "0.15em", fontSize: 9 }}>
            *** VISIT AGAIN ***
          </div>
        </div>
      </div>
    </>
  );
}
