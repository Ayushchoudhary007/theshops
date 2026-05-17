// ─────────────────────────────────────────────────────────────
// components/inventory/InventoryList.tsx
// ─────────────────────────────────────────────────────────────

import type { InventoryItem } from "../pages/inventory.types";
import { InventoryItemRow } from "./InventoryItemRow";

interface Props {
  items: InventoryItem[];
  refresh: () => void;
  onEdit: (item: InventoryItem) => void;
}

export const InventoryList = ({ items, refresh, onEdit }: Props) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    {items.map((item) => (
      <InventoryItemRow
        key={item.id}
        item={item}
        refresh={refresh}
        onEdit={onEdit}
      />
    ))}
  </div>
);
