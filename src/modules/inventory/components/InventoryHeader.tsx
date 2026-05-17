// ─────────────────────────────────────────────────────────────
// components/inventory/InventoryHeader.tsx
// ─────────────────────────────────────────────────────────────

import { BRAND, GLASS, RADIUS, FONT, GLOBAL_STYLES } from "../../../design-tokens";

const ShopIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke={BRAND}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const PlusIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

interface Props {
  onAdd: () => void;
}

export const InventoryHeader = ({ onAdd }: Props) => (
  <>
    <style>{GLOBAL_STYLES}</style>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
        marginBottom: 28,
      }}
    >
      {/* Brand wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: RADIUS.card,
            background: GLASS.backgroundDeep,
            backdropFilter: GLASS.backdropFilter,
            WebkitBackdropFilter: GLASS.backdropFilter,
            border: `1px solid ${GLASS.border}`,
            boxShadow: GLASS.shadow,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ShopIcon />
        </div>
        <div>
          <h1
            style={{
              fontFamily: FONT.family,
              fontSize: 22,
              fontWeight: 700,
              color: "#1a1a1a",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            Inventory
          </h1>
          <p
            style={{
              fontFamily: FONT.family,
              fontSize: 12,
              color: "#999",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginTop: 2,
            }}
          >
            Stock & Products
          </p>
        </div>
      </div>

      {/* Add button — pill style matching navbar */}
      <button
        className="iv-btn-primary"
        onClick={onAdd}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "10px 22px",
        }}
      >
        <PlusIcon />
        Add Product
      </button>
    </div>
  </>
);
