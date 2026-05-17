// ─────────────────────────────────────────────────────────────
// components/inventory/InventoryGrid.tsx
// ─────────────────────────────────────────────────────────────

import type { InventoryItem } from "../pages/inventory.types";
import { InventoryItemCard } from "./InventoryItemCard";

interface Props {
  items: InventoryItem[];
  refresh: () => void;
  onEdit: (item: InventoryItem) => void;
}

const GRID_CSS = `
  .iv-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 640px)  { .iv-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 900px)  { .iv-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (min-width: 1200px) { .iv-grid { grid-template-columns: repeat(4, 1fr); } }
`;

export const InventoryGrid = ({ items, refresh, onEdit }: Props) => (
  <>
    <style>{GRID_CSS}</style>
    <div className="iv-grid">
      {items.map((item) => (
        <InventoryItemCard
          key={item.id}
          item={item}
          refresh={refresh}
          onEdit={onEdit}
        />
      ))}
    </div>
  </>
);
