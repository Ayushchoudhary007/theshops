// ─────────────────────────────────────────────────────────────
// components/inventory/InventoryStats.tsx
// ─────────────────────────────────────────────────────────────

import { RADIUS, FONT, BRAND } from "../../../design-tokens";

interface Props {
  totalItems: number;
  totalValue: number;
  lowStock: number;
  outOfStock: number;
}

const STATS_CSS = `
  .iv-stat-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }
  @media (min-width: 640px) {
    .iv-stat-grid { grid-template-columns: repeat(4, 1fr); }
  }
  .iv-stat-card {
    border-radius: ${RADIUS.card};
    padding: 18px 20px;
    transition: transform 0.18s, box-shadow 0.18s;
  }
  .iv-stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6);
  }
`;

interface CardProps {
  label: string;
  value: string | number;
  accent?: string;
  icon: string;
}

const StatCard = ({ label, value, accent = "#334155", icon }: CardProps) => (
  <div className="iv-glass iv-stat-card">
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span
        style={{
          fontFamily: FONT.family,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#aaa",
        }}
      >
        {label}
      </span>
    </div>
    <p
      style={{
        fontFamily: FONT.family,
        fontSize: 28,
        fontWeight: 700,
        color: accent,
        lineHeight: 1,
        letterSpacing: "-0.02em",
      }}
    >
      {value}
    </p>
  </div>
);

export const InventoryStats = ({
  totalItems,
  totalValue,
  lowStock,
  outOfStock,
}: Props) => (
  <>
    <style>{STATS_CSS}</style>
    <div className="iv-stat-grid">
      <StatCard
        icon="📦"
        label="Total Items"
        value={totalItems}
        accent="#1e293b"
      />
      <StatCard
        icon="💰"
        label="Total Value"
        value={`₹${totalValue.toLocaleString("en-IN")}`}
        accent={BRAND}
      />
      <StatCard icon="⚠️" label="Low Stock" value={lowStock} accent="#a16207" />
      <StatCard
        icon="🚫"
        label="Out of Stock"
        value={outOfStock}
        accent="#b91c1c"
      />
    </div>
  </>
);
