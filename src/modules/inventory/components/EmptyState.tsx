// ─────────────────────────────────────────────────────────────
// components/inventory/EmptyState.tsx
// ─────────────────────────────────────────────────────────────

import { RADIUS, FONT} from "../../../design-tokens";

interface Props {
  onClear: () => void;
}

export const EmptyState = ({ onClear }: Props) => (
  <div
    className="iv-glass"
    style={{
      borderRadius: RADIUS.card,
      padding: "56px 32px",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
    }}
  >
    <div style={{ fontSize: 48, lineHeight: 1 }}>📦</div>
    <h3
      style={{
        fontFamily: FONT.family,
        fontSize: 18,
        fontWeight: 700,
        color: "#333",
      }}
    >
      No items found
    </h3>
    <p
      style={{
        fontFamily: FONT.family,
        fontSize: 13,
        color: "#999",
        maxWidth: 280,
      }}
    >
      Try adjusting your filters or search query, or add a new product.
    </p>
    <button
      className="iv-btn-primary"
      onClick={onClear}
      style={{ marginTop: 8 }}
    >
      Clear Filters
    </button>
  </div>
);
