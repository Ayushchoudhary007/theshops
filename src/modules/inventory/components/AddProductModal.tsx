// ─────────────────────────────────────────────────────────────
// components/inventory/AddProductModal.tsx
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { InventoryService } from "../pages/inventory.service";
import { GLASS, RADIUS, FONT } from "../../../design-tokens";
import type { InventoryItem } from "../pages/inventory.types";

// Barcode scanner + OnlineGate from theshop-v2 architecture
//import { OnlineGate} from "../../../app/OnlineGate";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

type FormData = Omit<InventoryItem, "id" | "syncedAt" | "status">;

const EMPTY: FormData = {
  name: "",
  category: "",
  brand: "",
  price: 0,
  stock: 0,
  image: "",
  sku: "",
  barcode: "",
  lastUpdated: "",
};

const ADD_CSS = `
  @keyframes iv-modal-in {
    from { opacity: 0; transform: scale(0.94) translateY(12px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
  }
  .iv-add-card {
    animation: iv-modal-in 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards;
    border-radius: ${RADIUS.card};
    padding: 24px;
    width: 100%; max-width: 500px;
    max-height: 90vh; overflow-y: auto;
    display: flex; flex-direction: column; gap: 13px;
  }
  .iv-divider-label {
    display: flex; align-items: center; gap: 10px;
    font-family: 'Inter', sans-serif; font-size: 11px;
    color: #aaa; letter-spacing: 0.08em; text-transform: uppercase;
  }
  .iv-divider-label::before, .iv-divider-label::after {
    content: ''; flex: 1; height: 1px;
    background: rgba(0,0,0,0.07);
  }
  .iv-field { display: flex; flex-direction: column; gap: 5px; }
  .iv-field label {
    font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600;
    color: #777; letter-spacing: 0.06em; text-transform: uppercase;
  }
  .iv-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .iv-scan-btn {
    width: 100%; padding: 12px;
    background: #0f172a;
    color: #fff; border: none; border-radius: 50px;
    font-size: 14px; font-weight: 600; font-family: 'Inter', sans-serif;
    cursor: pointer; letter-spacing: 0.02em;
    transition: background 0.15s, transform 0.12s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .iv-scan-btn:hover { background: #1e293b; transform: translateY(-1px); }
  .iv-scan-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
`;

export default function AddProductModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState<FormData>(EMPTY);
  // const [showScanner, setShowScanner] = useState(false);
  // const [lookupState, setLookupState] = useState<
  //   "idle" | "loading" | "found" | "not-found"
  // >("idle");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof FormData, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  // ── Barcode ───────────────────────────────────────────────
  // const handleBarcode = async (barcode: string) => {
  //   setShowScanner(false);
  //   set("barcode", barcode);
  //   set("sku", barcode);
  //   setLookupState("loading");

  //   const result = await InventoryService.lookupBarcode(barcode);
  //   if (result) {
  //     setForm((p) => ({
  //       ...p,
  //       barcode,
  //       sku: barcode,
  //       name: result.name || p.name,
  //       brand: result.brand || p.brand,
  //       category: result.category || p.category,
  //       image: result.image || p.image,
  //     }));
  //     setLookupState("found");
  //   } else {
  //     setLookupState("not-found");
  //   }
  // };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim() || !form.category.trim()) return;
    try {
      setLoading(true);
      await InventoryService.add({
        ...form,
        lastUpdated: new Date().toISOString(),
        status: "in-stock",
      });
      onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Scanner overlay
  // if (showScanner) {
  //   return (
  //     <OnlineGate feature="BARCODE_SCAN" soft silent>
  //       <BarcodeScanner
  //         onDetected={handleBarcode}
  //         onClose={() => setShowScanner(false)}
  //       />
  //     </OnlineGate>
  //   );
  // }

  return (
    <>
      <style>{ADD_CSS}</style>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          zIndex: 60000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          className="iv-glass iv-add-card"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2
              style={{
                fontFamily: FONT.family,
                fontSize: 18,
                fontWeight: 700,
                color: "#1a1a1a",
              }}
            >
              Add New Product
            </h2>
            <button
              onClick={onClose}
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.07)",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                color: "#666",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>

          {/* Barcode scan button 
          <OnlineGate feature="BARCODE_SCAN" soft>
            <button
              className="iv-scan-btn"
              onClick={() => setShowScanner(true)}
              disabled={lookupState === "loading"}
            >
              📷 {lookupState === "loading" ? "Looking up…" : "Scan Barcode"}
            </button>
          </OnlineGate>*/}

          {/* Lookup feedback 
          {lookupState === "found" && (
            <p
              style={{
                fontFamily: FONT.family,
                fontSize: 12,
                color: "#16a34a",
                textAlign: "center",
              }}
            >
              ✓ Product found — details auto-filled
            </p>
          )}
          {lookupState === "not-found" && (
            <p
              style={{
                fontFamily: FONT.family,
                fontSize: 12,
                color: "#aaa",
                textAlign: "center",
              }}
            >
              Barcode unknown — fill in details below
            </p>
          )}

          <div className="iv-divider-label">or enter manually</div>
*/}
          {/* Form */}
          <div className="iv-field">
            <label>Product Name *</label>
            <input
              className="iv-input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Wireless Headphones"
            />
          </div>

          <div className="iv-two-col">
            <div className="iv-field">
              <label>Category *</label>
              <input
                className="iv-input"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="Electronics"
              />
            </div>
            <div className="iv-field">
              <label>Brand</label>
              <input
                className="iv-input"
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
                placeholder="Sony"
              />
            </div>
          </div>

          <div className="iv-two-col">
            <div className="iv-field">
              <label>Price ($)</label>
              <input
                className="iv-input"
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => set("price", Number(e.target.value))}
              />
            </div>
            <div className="iv-field">
              <label>Stock</label>
              <input
                className="iv-input"
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => set("stock", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="iv-field">
            <label>SKU</label>
            <input
              className="iv-input"
              value={form.sku}
              onChange={(e) => set("sku", e.target.value)}
              placeholder="SKU-0001"
            />
          </div>

          <div className="iv-field">
            <label>Image URL</label>
            <input
              className="iv-input"
              value={form.image}
              onChange={(e) => set("image", e.target.value)}
              placeholder="https://…"
            />
          </div>

          {/* Image preview */}
          {form.image && (
            <img
              src={form.image}
              alt="preview"
              style={{
                width: "100%",
                height: 110,
                objectFit: "cover",
                borderRadius: RADIUS.item,
                border: `1px solid ${GLASS.border}`,
              }}
            />
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              className="iv-btn-ghost"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              className="iv-btn-primary"
              onClick={handleSubmit}
              disabled={loading}
              style={{ flex: 2 }}
            >
              {loading ? "Adding…" : "Add Product"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
