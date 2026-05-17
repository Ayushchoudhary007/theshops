// ─────────────────────────────────────────────────────────────
// components/inventory/InventoryItemRow.tsx
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import type { InventoryItem } from "../pages/inventory.types";
import { STATUS, RADIUS, FONT, BRAND } from "../../../design-tokens";
import { InventoryService } from "../pages/inventory.service";
import DeleteConfirmModal from "./DeleteConfirmModal";

interface Props {
  item: InventoryItem;
  refresh: () => void;
  onEdit: (item: InventoryItem) => void;
}

const ROW_CSS = `
  .iv-row {
    border-radius: ${RADIUS.card};
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    transition: transform 0.18s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.18s;
  }
  .iv-row:hover {
    transform: translateX(4px);
    box-shadow: 0 12px 36px rgba(0,0,0,0.11), inset 0 1px 0 rgba(255,255,255,0.6);
  }
  .iv-row-img {
    width: 56px; height: 56px;
    border-radius: ${RADIUS.item};
    object-fit: cover; flex-shrink: 0;
    border: 1px solid rgba(255,255,255,0.55);
  }
  .iv-row-action {
    padding: 7px 16px;
    border-radius: 50px;
    font-size: 12px; font-weight: 600;
    font-family: 'Inter', sans-serif;
    cursor: pointer; border: 1px solid;
    transition: transform 0.12s, background 0.15s;
    white-space: nowrap; flex-shrink: 0;
  }
  .iv-row-action:hover { transform: translateY(-1px); }
  .iv-row-action:active { transform: scale(0.97); }
  @media (max-width: 560px) {
    .iv-row-meta { display: none !important; }
    .iv-row-actions { display: none !important; }
  }
`;

export const InventoryItemRow = ({ item, refresh, onEdit }: Props) => {
  const [showDelete, setShowDelete] = useState(false);
  const st = STATUS[item.status];
  const syncColor = item.syncedAt ? "#22c55e" : "#f59e0b";

  const handleDelete = async () => {
    await InventoryService.delete(item.id);
    setShowDelete(false);
    refresh();
  };

  return (
    <>
      <style>{ROW_CSS}</style>

      <div className="iv-glass iv-row">
        {/* Thumbnail */}
        <img
          className="iv-row-img"
          src={item.image || "/assets/placeholder.jpg"}
          alt={item.name}
        />

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <h3
              style={{
                fontFamily: FONT.family,
                fontSize: 14,
                fontWeight: 700,
                color: "#1a1a1a",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.name}
            </h3>
            {/* sync dot */}
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: syncColor,
                flexShrink: 0,
                border: "1px solid rgba(255,255,255,0.7)",
              }}
              title={item.syncedAt ? "Synced" : "Pending sync"}
            />
          </div>
          <p
            style={{
              fontFamily: FONT.family,
              fontSize: 11,
              color: "#888",
              marginTop: 2,
            }}
          >
            {item.category} · {item.brand}
          </p>
          <p
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 10,
              color: "#bbb",
              letterSpacing: "0.03em",
            }}
          >
            SKU: {item.sku}
          </p>
        </div>

        {/* Status badge */}
        <div
          style={{
            background: st.bg,
            border: `1px solid ${st.text}22`,
            borderRadius: RADIUS.badge,
            padding: "3px 10px",
            fontSize: 11,
            fontWeight: 700,
            fontFamily: FONT.family,
            color: st.text,
            letterSpacing: "0.04em",
            flexShrink: 0,
          }}
        >
          {st.label}
        </div>

        {/* Price + stock */}
        <div
          className="iv-row-meta"
          style={{ textAlign: "right", flexShrink: 0 }}
        >
          <p
            style={{
              fontFamily: FONT.family,
              fontSize: 16,
              fontWeight: 700,
              color: BRAND,
            }}
          >
            ${item.price.toFixed(2)}
          </p>
          <p
            style={{
              fontFamily: FONT.family,
              fontSize: 11,
              color: "#888",
              marginTop: 2,
            }}
          >
            {item.stock} in stock
          </p>
        </div>

        {/* Actions */}
        <div
          className="iv-row-actions"
          style={{ display: "flex", gap: 7, flexShrink: 0 }}
        >
          <button
            className="iv-row-action"
            onClick={() => onEdit(item)}
            style={{
              background: "rgba(37,99,235,0.09)",
              borderColor: "rgba(37,99,235,0.22)",
              color: "#1d4ed8",
            }}
          >
            Edit
          </button>
          <button
            className="iv-row-action"
            onClick={() => setShowDelete(true)}
            style={{
              background: "rgba(239,68,68,0.09)",
              borderColor: "rgba(239,68,68,0.22)",
              color: "#b91c1c",
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {showDelete && (
        <DeleteConfirmModal
          product={item}
          onClose={() => setShowDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
};
