// ─────────────────────────────────────────────────────────────
// components/inventory/DeleteConfirmModal.tsx
// ─────────────────────────────────────────────────────────────

import { RADIUS, FONT } from "../../../design-tokens";
import type { InventoryItem } from "../pages/inventory.types";

interface Props {
  product: InventoryItem;
  onClose: () => void;
  onConfirm: () => void;
}

const MODAL_CSS = `
  @keyframes iv-modal-in {
    from { opacity: 0; transform: scale(0.94) translateY(10px); }
    to   { opacity: 1; transform: scale(1)    translateY(0);    }
  }
  .iv-modal-card {
    animation: iv-modal-in 0.20s cubic-bezier(0.34,1.56,0.64,1) forwards;
    border-radius: ${RADIUS.card};
    padding: 28px 24px 24px;
    width: 100%; max-width: 360px;
    display: flex; flex-direction: column; align-items: center;
    gap: 10px;
    text-align: center;
  }
`;

export default function DeleteConfirmModal({
  product,
  onClose,
  onConfirm,
}: Props) {
  return (
    <>
      <style>{MODAL_CSS}</style>

      {/* Backdrop */}
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
          className="iv-glass iv-modal-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: 36 }}>🗑️</div>

          <h2
            style={{
              fontFamily: FONT.family,
              fontSize: 17,
              fontWeight: 700,
              color: "#b91c1c",
            }}
          >
            Delete Product?
          </h2>

          <p
            style={{
              fontFamily: FONT.family,
              fontSize: 13,
              color: "#666",
              lineHeight: 1.6,
            }}
          >
            You're about to delete{" "}
            <strong style={{ color: "#222" }}>{product.name}</strong>.
            <br />
            <span style={{ color: "#bbb", fontSize: 12 }}>
              This cannot be undone.
            </span>
          </p>

          <div
            style={{ display: "flex", gap: 10, width: "100%", marginTop: 8 }}
          >
            <button
              className="iv-btn-ghost"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              className="iv-btn-danger"
              onClick={onConfirm}
              style={{ flex: 1 }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
