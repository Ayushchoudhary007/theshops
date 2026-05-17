// ─────────────────────────────────────────────────────────────
// src/modules/inventory/components/EditProductModal.tsx
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import type { InventoryItem } from "../pages/inventory.types";
import { InventoryService } from "../pages/inventory.service";

interface Props {
  product: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
}

const BRAND = "#c0392b";
const RADIUS = "22px";
const FONT = "'Inter', sans-serif";

/* ── All styles self-contained — no dependency on GLOBAL_STYLES ── */
const MODAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  @keyframes iv-edit-in {
    from { opacity: 0; transform: scale(0.93) translateY(14px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
  }

  /* ── Shared input ── */
  .em-input {
    width: 100%;
    background: rgba(255,255,255,0.65);
    border: 1px solid rgba(255,255,255,0.75);
    border-radius: 10px;
    padding: 10px 13px;
    font-size: 14px;
    font-family: ${FONT};
    color: #1a1a1a;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
    backdrop-filter: blur(8px);
  }
  .em-input:focus {
    border-color: rgba(192,57,43,0.50);
    box-shadow: 0 0 0 3px rgba(192,57,43,0.10);
  }
  .em-input::placeholder { color: #b0b0b0; }

  /* ── Select styled to match input ── */
  .em-select {
    width: 100%;
    background: rgba(255,255,255,0.65);
    border: 1px solid rgba(255,255,255,0.75);
    border-radius: 10px;
    padding: 10px 32px 10px 13px;
    font-size: 14px;
    font-family: ${FONT};
    color: #1a1a1a;
    outline: none;
    box-sizing: border-box;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23aaa' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    transition: border-color 0.15s, box-shadow 0.15s;
    backdrop-filter: blur(8px);
  }
  .em-select:focus {
    border-color: rgba(192,57,43,0.50);
    box-shadow: 0 0 0 3px rgba(192,57,43,0.10);
  }

  /* ── Field label ── */
  .em-label {
    font-family: ${FONT};
    font-size: 11px; font-weight: 600;
    color: #888; letter-spacing: 0.07em;
    text-transform: uppercase;
    display: block; margin-bottom: 5px;
  }

  /* ── Two-col grid ── */
  .em-grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  /* ── Primary button ── */
  .em-btn-primary {
    background: ${BRAND};
    color: #fff; border: none;
    border-radius: 50px;
    padding: 11px 20px;
    font-size: 14px; font-weight: 600;
    font-family: ${FONT};
    cursor: pointer;
    box-shadow: 0 3px 12px rgba(192,57,43,0.28);
    transition: background 0.15s, transform 0.12s, box-shadow 0.15s;
    white-space: nowrap;
  }
  .em-btn-primary:hover  { background: #a93226; transform: translateY(-1px); box-shadow: 0 5px 18px rgba(192,57,43,0.35); }
  .em-btn-primary:active { transform: scale(0.97); }
  .em-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

  /* ── Ghost button ── */
  .em-btn-ghost {
    background: rgba(255,255,255,0.50);
    color: #555; border: 1px solid rgba(255,255,255,0.72);
    border-radius: 50px;
    padding: 11px 20px;
    font-size: 14px; font-weight: 500;
    font-family: ${FONT};
    cursor: pointer;
    backdrop-filter: blur(8px);
    transition: background 0.15s, transform 0.12s;
    white-space: nowrap;
  }
  .em-btn-ghost:hover  { background: rgba(255,255,255,0.72); transform: translateY(-1px); }
  .em-btn-ghost:active { transform: scale(0.97); }

  /* ── Status pill preview ── */
  .em-status-preview {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 999px;
    font-size: 12px; font-weight: 600;
    font-family: ${FONT};
  }
`;

export default function EditProductModal({
  product,
  onClose,
  onSuccess,
}: Props) {
  const [form, setForm] = useState<InventoryItem>({ ...product });
  const [loading, setLoading] = useState(false);

  const set = (key: keyof InventoryItem, value: string | number) =>
    setForm((p) => ({ ...p, [key]: value }));

  /* Auto-update status when stock changes */
  const setStock = (v: number) => {
    const status = v === 0 ? "out-of-stock" : v < 10 ? "low-stock" : "in-stock";
    setForm((p) => ({ ...p, stock: v, status }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    try {
      setLoading(true);
      await InventoryService.update(product.id, {
        ...form,
        lastUpdated: new Date().toISOString(),
      });
      onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  /* Status badge colours */
  const statusStyle: Record<string, { bg: string; color: string }> = {
    "in-stock": { bg: "rgba(34,197,94,0.12)", color: "#15803d" },
    "low-stock": { bg: "rgba(234,179,8,0.14)", color: "#a16207" },
    "out-of-stock": { bg: "rgba(239,68,68,0.12)", color: "#b91c1c" },
  };
  const ss = statusStyle[form.status] ?? statusStyle["in-stock"];

  return (
    <>
      <style>{MODAL_CSS}</style>

      {/* ── Backdrop ── */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.38)",
          backdropFilter: "blur(7px)",
          WebkitBackdropFilter: "blur(7px)",
          zIndex: 60000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        {/* ── Sheet ── */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            animation:
              "iv-edit-in 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards",
            background: "rgba(255,255,255,0.48)",
            backdropFilter: "blur(28px) saturate(220%)",
            WebkitBackdropFilter: "blur(28px) saturate(220%)",
            border: "1px solid rgba(255,255,255,0.68)",
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.65)",
            borderRadius: RADIUS,
            padding: "26px 26px 22px",
            width: "100%",
            maxWidth: 520,
            maxHeight: "90vh",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            fontFamily: FONT,
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#1a1a1a",
                  margin: 0,
                }}
              >
                Edit Product
              </h2>
              <p style={{ fontSize: 12, color: "#aaa", margin: "3px 0 0" }}>
                SKU: {product.sku}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.07)",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                color: "#666",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          {/* ── Image preview strip ── */}
          {form.image && (
            <div
              style={{
                position: "relative",
                borderRadius: 14,
                overflow: "hidden",
                height: 130,
              }}
            >
              <img
                src={form.image}
                alt="preview"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              {/* Status badge over image */}
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  ...ss,
                  borderRadius: "999px",
                  padding: "3px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
              >
                {form.status
                  .replace("-", " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </div>
            </div>
          )}

          {/* ── Product name ── */}
          <div>
            <label className="em-label">Product Name *</label>
            <input
              className="em-input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Wireless Headphones"
            />
          </div>

          {/* ── Brand + Category ── */}
          <div className="em-grid2">
            <div>
              <label className="em-label">Brand</label>
              <input
                className="em-input"
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
                placeholder="Brand"
              />
            </div>
            <div>
              <label className="em-label">Category</label>
              <input
                className="em-input"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="Category"
              />
            </div>
          </div>

          {/* ── Price + Stock ── */}
          <div className="em-grid2">
            <div>
              <label className="em-label">Price (₹)</label>
              <input
                className="em-input"
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={(e) => set("price", Number(e.target.value))}
              />
            </div>
            <div>
              <label className="em-label">Stock</label>
              <input
                className="em-input"
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setStock(Number(e.target.value))}
              />
            </div>
          </div>

          {/* ── Status — driven by stock but overrideable ── */}
          <div>
            <label className="em-label">Status</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <select
                className="em-select"
                value={form.status}
                onChange={(e) =>
                  set("status", e.target.value as InventoryItem["status"])
                }
                style={{ flex: 1 }}
              >
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>
              {/* Live badge preview */}
              <span
                className="em-status-preview"
                style={{ background: ss.bg, color: ss.color, flexShrink: 0 }}
              >
                {form.status === "in-stock" ? "✓ In Stock" : ""}
                {form.status === "low-stock" ? "⚠ Low Stock" : ""}
                {form.status === "out-of-stock" ? "✕ Out of Stock" : ""}
              </span>
            </div>
            {/* Helper text — stock auto-derives status */}
            <p style={{ fontSize: 11, color: "#bbb", margin: "5px 0 0" }}>
              Auto-set from stock: &lt;10 → Low Stock, 0 → Out of Stock
            </p>
          </div>

          {/* ── Image URL ── */}
          <div>
            <label className="em-label">Image URL</label>
            <input
              className="em-input"
              value={form.image}
              onChange={(e) => set("image", e.target.value)}
              placeholder="https://…"
            />
          </div>

          {/* ── Divider ── */}
          <div
            style={{
              height: 1,
              background: "rgba(0,0,0,0.06)",
              margin: "0 -4px",
            }}
          />

          {/* ── Actions ── */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="em-btn-ghost"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              className="em-btn-primary"
              onClick={handleSubmit}
              disabled={loading || !form.name.trim()}
              style={{ flex: 2 }}
            >
              {loading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
