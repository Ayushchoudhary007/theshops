// ─────────────────────────────────────────────────────────────
// components/inventory/InventoryItemCard.tsx
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

const CARD_CSS = `
  .iv-card {
    border-radius: ${RADIUS.card};
    overflow: hidden;
    transition: transform 0.20s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.20s;
    cursor: default;
    position: relative;
  }
  .iv-card:hover {
    transform: translateY(-4px) scale(1.01);
    box-shadow: 0 20px 48px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.6);
  }
  .iv-card-img {
    width: 100%; height: 180px;
    object-fit: cover; display: block;
  }
  .iv-card-img-wrap {
    position: relative; overflow: hidden;
  }
  .iv-card-body {
    padding: 14px 16px 16px;
    display: flex; flex-direction: column; gap: 6px;
  }
  .iv-card-actions {
    display: flex; gap: 8px; margin-top: 8px;
  }
  .iv-card-action-btn {
    flex: 1; padding: 8px 0;
    border-radius: 50px;
    font-size: 13px; font-weight: 600;
    font-family: 'Inter', sans-serif;
    cursor: pointer; border: 1px solid;
    transition: transform 0.12s, background 0.15s;
  }
  .iv-card-action-btn:hover { transform: translateY(-1px); }
  .iv-card-action-btn:active { transform: scale(0.97); }

  /* Sync dot */
  .iv-sync-dot {
    position: absolute; top: 10px; left: 10px;
    width: 8px; height: 8px; border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,0.8);
  }
`;

export const InventoryItemCard = ({ item, refresh, onEdit }: Props) => {
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
      <style>{CARD_CSS}</style>

      <div className="iv-glass iv-card">
        {/* Product image */}
        <div className="iv-card-img-wrap">
          <img
            className="iv-card-img"
            src={item.image || "/assets/placeholder.jpg"}
            alt={item.name}
          />

          {/* Status badge — glass pill on top of image */}
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              background: st.bg,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: `1px solid ${st.text}22`,
              borderRadius: RADIUS.badge,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: FONT.family,
              color: st.text,
              letterSpacing: "0.04em",
            }}
          >
            {st.label}
          </div>

          {/* Sync indicator dot */}
          <div
            className="iv-sync-dot"
            style={{ background: syncColor }}
            title={item.syncedAt ? "Synced" : "Pending sync"}
          />
        </div>

        {/* Body */}
        <div className="iv-card-body">
          <h3
            style={{
              fontFamily: FONT.family,
              fontSize: 15,
              fontWeight: 700,
              color: "#1a1a1a",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.name}
          </h3>

          <p
            style={{
              fontFamily: FONT.family,
              fontSize: 12,
              color: "#888",
            }}
          >
            {item.brand} · {item.category}
          </p>

          <p
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 10,
              color: "#aaa",
              letterSpacing: "0.04em",
            }}
          >
            SKU: {item.sku}
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 4,
            }}
          >
            <span
              style={{
                fontFamily: FONT.family,
                fontSize: 18,
                fontWeight: 700,
                color: BRAND,
              }}
            >
              ${item.price.toFixed(2)}
            </span>

            <span
              style={{
                fontFamily: FONT.family,
                fontSize: 12,
                color: "#666",
                background: "rgba(0,0,0,0.05)",
                padding: "3px 10px",
                borderRadius: RADIUS.badge,
              }}
            >
              {item.stock} left
            </span>
          </div>

          {/* Actions */}
          <div className="iv-card-actions">
            <button
              className="iv-card-action-btn"
              onClick={() => onEdit(item)}
              style={{
                background: "rgba(37,99,235,0.10)",
                borderColor: "rgba(37,99,235,0.22)",
                color: "#1d4ed8",
              }}
            >
              Edit
            </button>
            <button
              className="iv-card-action-btn"
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
