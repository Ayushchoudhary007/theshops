// ─────────────────────────────────────────────────────────────
// components/inventory/InventoryFilters.tsx
// ─────────────────────────────────────────────────────────────

import { BRAND, RADIUS } from "../../../design-tokens";
import type { SortBy, ViewMode } from "../pages/inventory.types";

interface Props {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  selectedStatus: string;
  setSelectedStatus: (v: string) => void;
  sortBy: SortBy;
  setSortBy: (v: SortBy) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
}

const SearchIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const FILTER_CSS = `
  .iv-filter-wrap {
    border-radius: ${RADIUS.card};
    padding: 16px 18px;
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .iv-filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .iv-search-wrap {
    position: relative;
    flex: 1;
    min-width: 200px;
  }
  .iv-search-wrap svg {
    position: absolute;
    left: 12px; top: 50%;
    transform: translateY(-50%);
    color: #aaa; pointer-events: none;
  }
  .iv-search-wrap input { padding-left: 36px !important; }

  .iv-select {
    background: rgba(255,255,255,0.55);
    border: 1px solid rgba(255,255,255,0.70);
    border-radius: 50px;
    padding: 8px 14px;
    font-size: 13px;
    font-family: 'Inter', sans-serif;
    color: #333;
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    backdrop-filter: blur(8px);
    appearance: none;
    -webkit-appearance: none;
    padding-right: 28px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23aaa' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
  }
  .iv-select:focus {
    border-color: rgba(192,57,43,0.45);
    box-shadow: 0 0 0 3px rgba(192,57,43,0.10);
  }

  .iv-view-btn {
    width: 36px; height: 36px;
    border-radius: 50px;
    border: 1px solid rgba(255,255,255,0.65);
    background: rgba(255,255,255,0.40);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 15px;
    transition: background 0.15s, transform 0.12s, border-color 0.15s;
    backdrop-filter: blur(8px);
    color: #666;
  }
  .iv-view-btn:hover { background: rgba(255,255,255,0.65); transform: scale(1.08); }
  .iv-view-btn.on {
    background: rgba(192,57,43,0.12);
    border-color: rgba(192,57,43,0.30);
    color: ${BRAND};
  }
`;

export const InventoryFilters = ({
  searchQuery,
  setSearchQuery,
  categories,
  selectedCategory,
  setSelectedCategory,
  selectedStatus,
  setSelectedStatus,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
}: Props) => (
  <>
    <style>{FILTER_CSS}</style>
    <div className="iv-glass iv-filter-wrap">
      {/* Row 1: search */}
      <div className="iv-filter-row">
        <div className="iv-search-wrap">
          <SearchIcon />
          <input
            className="iv-input"
            type="text"
            placeholder="Search by name, SKU, or brand…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Row 2: selects + view toggle */}
      <div className="iv-filter-row">
        <select
          className="iv-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All Categories" : c}
            </option>
          ))}
        </select>

        <select
          className="iv-select"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="in-stock">In Stock</option>
          <option value="low-stock">Low Stock</option>
          <option value="out-of-stock">Out of Stock</option>
        </select>

        <select
          className="iv-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
        >
          <option value="name">Name A–Z</option>
          <option value="price-low">Price ↑</option>
          <option value="price-high">Price ↓</option>
          <option value="stock-low">Stock ↑</option>
          <option value="stock-high">Stock ↓</option>
          <option value="recent">Recently Updated</option>
        </select>

        {/* View toggle — pushed to end */}
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          <button
            title="Grid view"
            className={`iv-view-btn${viewMode === "grid" ? " on" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            ⊞
          </button>
          <button
            title="List view"
            className={`iv-view-btn${viewMode === "list" ? " on" : ""}`}
            onClick={() => setViewMode("list")}
          >
            ☰
          </button>
        </div>
      </div>
    </div>
  </>
);
