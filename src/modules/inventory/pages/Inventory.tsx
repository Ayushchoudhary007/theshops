// ─────────────────────────────────────────────────────────────
// src/modules/inventory/pages/Inventory.tsx
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState, useCallback } from "react";
import { InventoryService } from "../pages/inventory.service";

import AddProductModal from "../components/AddProductModal";
import EditProductModal from "../components/EditProductModal";
import { InventoryHeader } from "../components/InventoryHeader";
import { InventoryStats } from "../components/InventoryStats";
import { InventoryFilters } from "../components/InventoryFilters";
import { InventoryGrid } from "../components/InventoryGrid";
import { InventoryList } from "../components/InventoryList";
import { EmptyState } from "../components/EmptyState";

import type { InventoryItem, SortBy, ViewMode } from "../pages/inventory.types";

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  .iv-page {
    min-height: 100vh;
    width: 100%;
    background: linear-gradient(135deg,
      #fce4e4 0%, #fde8d8 20%, #fef9c3 40%,
      #dcfce7 60%, #dbeafe 80%, #ede9fe 100%);
    /* top: 56px navbar + 18px offset + 18px breathing room = 92px */
    /* bottom: 62px mobile pill + 18px offset + 20px breathing room = 100px */
    padding: 92px 32px 100px;
    box-sizing: border-box;
  }

  .iv-page-inner {
    /* Full width up to a generous max — no false centering at 1280 */
    max-width: 1440px;
    width: 100%;
    margin: 0 auto;
  }

  /* On mobile clear the bottom pill */
  @media (max-width: 768px) {
    .iv-page { padding: 92px 16px 100px; }
  }

  /* On desktop no bottom-pill clearance needed */
  @media (min-width: 769px) {
    .iv-page { padding-bottom: 48px; }
  }
`;

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState<InventoryItem | null>(null);

  const loadItems = useCallback(async () => {
    const data = await InventoryService.getAll();
    setItems(data);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const categories = useMemo(
    () => ["all", ...new Set(items.map((i) => i.category))],
    [items],
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return items
      .filter((item) => {
        const matchSearch =
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          item.brand.toLowerCase().includes(q) ||
          (item.barcode?.includes(q) ?? false);
        const matchCat =
          selectedCategory === "all" || item.category === selectedCategory;
        const matchStatus =
          selectedStatus === "all" || item.status === selectedStatus;
        return matchSearch && matchCat && matchStatus;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "price-low":
            return a.price - b.price;
          case "price-high":
            return b.price - a.price;
          case "stock-low":
            return a.stock - b.stock;
          case "stock-high":
            return b.stock - a.stock;
          case "recent":
            return (
              new Date(b.lastUpdated).getTime() -
              new Date(a.lastUpdated).getTime()
            );
          default:
            return a.name.localeCompare(b.name);
        }
      });
  }, [items, searchQuery, selectedCategory, selectedStatus, sortBy]);

  const stats = useMemo(
    () => ({
      totalItems: items.length,
      totalValue: items.reduce((s, i) => s + i.price * i.stock, 0),
      lowStock: items.filter((i) => i.status === "low-stock").length,
      outOfStock: items.filter((i) => i.status === "out-of-stock").length,
    }),
    [items],
  );

  return (
    <>
      <style>{PAGE_CSS}</style>
      <div className="iv-page">
        <div className="iv-page-inner">
          <InventoryHeader onAdd={() => setShowAddModal(true)} />
          <InventoryStats {...stats} />
          <InventoryFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            sortBy={sortBy}
            setSortBy={setSortBy}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
          {filteredItems.length === 0 ? (
            <EmptyState
              onClear={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedStatus("all");
              }}
            />
          ) : viewMode === "grid" ? (
            <InventoryGrid
              items={filteredItems}
              refresh={loadItems}
              onEdit={setEditProduct}
            />
          ) : (
            <InventoryList
              items={filteredItems}
              refresh={loadItems}
              onEdit={setEditProduct}
            />
          )}
        </div>
      </div>

      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onSuccess={loadItems}
        />
      )}
      {editProduct && (
        <EditProductModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSuccess={loadItems}
        />
      )}
    </>
  );
}
