// ─────────────────────────────────────────────────────────────
// src/modules/home/Home.tsx
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BRAND, FONT } from "../../design-tokens";
import { InventoryService } from "../inventory/pages/inventory.service";
import type { InventoryItem } from "../inventory/pages/inventory.types";
const HOME_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  .home-page {
    min-height: 100vh;
    width: 100%;
    box-sizing: border-box;
    background: linear-gradient(135deg,
      #fce4e4 0%, #fde8d8 20%, #fef9c3 40%,
      #dcfce7 60%, #dbeafe 80%, #ede9fe 100%);
    background-attachment: fixed;
    padding: 92px 32px 100px;
    font-family: 'Inter', sans-serif;
  }
  .home-inner {
    max-width: 1440px;
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  /* Hero */
  .home-hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
  }

  /* Stats grid */
  .home-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  @media (min-width: 640px) { .home-stats { grid-template-columns: repeat(4, 1fr); } }

  /* Quick actions */
  .home-actions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  @media (min-width: 640px) { .home-actions { grid-template-columns: repeat(4, 1fr); } }

  /* Bottom two-col */
  .home-bottom {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
  }
  @media (min-width: 768px) { .home-bottom { grid-template-columns: 1fr 1fr; } }

  /* Glass card base */
  .home-card {
    background: rgba(255,255,255,0.38);
    backdrop-filter: blur(20px) saturate(200%);
    -webkit-backdrop-filter: blur(20px) saturate(200%);
    border: 1px solid rgba(255,255,255,0.62);
    box-shadow: 0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5);
    border-radius: 22px;
    isolation: isolate;
  }

  /* Action card hover */
  .home-action-card {
    border-radius: 18px;
    padding: 20px 18px;
    cursor: pointer;
    border: none;
    transition: transform 0.20s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.20s;
    text-align: left;
    width: 100%;
  }
  .home-action-card:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 20px 48px rgba(0,0,0,0.13), inset 0 1px 0 rgba(255,255,255,0.7);
  }

  /* Stat card hover */
  .home-stat-card {
    border-radius: 22px;
    padding: 20px 22px;
    transition: transform 0.18s, box-shadow 0.18s;
  }
  .home-stat-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.11), inset 0 1px 0 rgba(255,255,255,0.6);
  }

  /* Activity list row */
  .home-activity-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(0,0,0,0.05);
  }
  .home-activity-row:last-child { border-bottom: none; }

  @media (min-width: 769px) {
    .home-page { padding-bottom: 40px; }
  }
`;

/* ── Quick action data ───────────────────────────────────── */
const ACTIONS = [
  {
    label: "Add Product",
    icon: "📦",
    desc: "Add to inventory",
    color: "#3b82f6",
    path: "/inventory",
  },
  {
    label: "New Invoice",
    icon: "🧾",
    desc: "Create a bill",
    color: "#8b5cf6",
    path: "/billing",
  },
  // {
  //   label: "Scan Barcode",
  //   icon: "📷",
  //   desc: "Quick stock lookup",
  //   color: "#c0392b",
  //   path: "/inventory",
  // },
  {
    label: "View Reports",
    icon: "📊",
    desc: "Analytics & trends",
    color: "#10b981",
    path: "/report",
  },
];

/* ── Component ───────────────────────────────────────────── */
export default function Home() {
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
 // const [loading, setLoading] = useState(true);

  // Fetch inventory items on mount
  useEffect(() => {
    const fetchItems = async () => {
      try {
        // setLoading(true);
        const data = await InventoryService.getAll();
        setItems(data);
      } catch (error) {
        console.error("Failed to fetch inventory items:", error);
        setItems([]);
      } finally {
        // setLoading(false);
      }
    };

    fetchItems();
  }, []);

  // Calculate stats from items
  const stats = useMemo(
    () => ({
      totalItems: items.length,
      totalValue: items.reduce((s, i) => s + i.price * i.stock, 0),
      lowStock: items.filter((i) => i.status === "low-stock").length,
    }),
    [items],
  );

  /* ── Stats data ─────────────────────────────────────────── */
  const STATS = [
    {
      icon: "📦",
      label: "Total Items",
      value: stats.totalItems,
      accent: "#1e293b",
    },
    {
      icon: "💰",
      label: "Total Value",
      value: `₹${stats.totalValue.toLocaleString("en-IN")}`,
      accent: BRAND,
    },
    {
      icon: "⚠️",
      label: "Low Stock",
      value: stats.lowStock,
      accent: "#a16207",
    },
    { icon: "🧾", label: "Today's Sales", value: "--", accent: "#8b5cf6" },
  ];

  /* ── Recent activity (mock — replace with live data) ─────── */
  // const ACTIVITY = [
  //   {
  //     icon: "📦",
  //     text: "Wireless Headphones stock updated",
  //     time: "2m ago",
  //     color: "#3b82f6",
  //   },
  //   {
  //     icon: "🧾",
  //     text: "Invoice #1042 created",
  //     time: "18m ago",
  //     color: "#8b5cf6",
  //   },
  //   {
  //     icon: "✅",
  //     text: "3 items synced to cloud",
  //     time: "1h ago",
  //     color: "#10b981",
  //   },
  //   {
  //     icon: "⚠️",
  //     text: "Running Shoes — low stock alert",
  //     time: "3h ago",
  //     color: "#a16207",
  //   },
  //   {
  //     icon: "➕",
  //     text: "Coffee Maker added to inventory",
  //     time: "Yesterday",
  //     color: "#c0392b",
  //   },
  // ];

  /* ── Alerts (mock) ───────────────────────────────────────── */
  const ALERTS = [
    {
      icon: "⚠️",
      text: "2 products are running low",
      color: "#a16207",
      bg: "rgba(234,179,8,0.10)",
    },
    {
      icon: "🚫",
      text: "1 product is out of stock",
      color: "#b91c1c",
      bg: "rgba(239,68,68,0.10)",
    },
  ];

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <style>{HOME_CSS}</style>
      <div className="home-page">
        <div className="home-inner">
          {/* ── Hero ── */}
          <div className="home-hero">
            <div>
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#1a1a1a",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                {greeting} 👋
              </h1>
              <p
                style={{
                  fontSize: 14,
                  color: "#888",
                  marginTop: 6,
                  margin: "6px 0 0",
                }}
              >
                {now.toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
                {" · "}TheShop Dashboard
              </p>
            </div>

            <button
              onClick={() => navigate("/inventory")}
              style={{
                background: BRAND,
                color: "#fff",
                border: "none",
                borderRadius: "50px",
                padding: "10px 22px",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: FONT.family,
                cursor: "pointer",
                boxShadow: "0 3px 12px rgba(192,57,43,0.28)",
                transition: "transform 0.12s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateY(-1px)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
            >
              Open Inventory →
            </button>
          </div>

          {/* ── Stats ── */}
          <div className="home-stats">
            {STATS.map((s) => (
              <div key={s.label} className="home-card home-stat-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{s.icon}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#aaa",
                    }}
                  >
                    {s.label}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 30,
                    fontWeight: 800,
                    color: s.accent,
                    margin: 0,
                    letterSpacing: "-0.03em",
                  }}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* ── Quick actions ── */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "#aaa",
                marginBottom: 12,
              }}
            >
              Quick Actions
            </p>
            <div className="home-actions">
              {ACTIONS.map((a) => (
                <button
                  key={a.label}
                  className="home-card home-action-card"
                  onClick={() => navigate(a.path)}
                  style={{
                    background: `${a.color}12`,
                    border: `1px solid ${a.color}22`,
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      marginBottom: 12,
                      background: `${a.color}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      boxShadow: `0 2px 8px ${a.color}22`,
                    }}
                  >
                    {a.icon}
                  </div>
                  <p
                    style={{
                      fontFamily: FONT.family,
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#1a1a1a",
                      margin: "0 0 3px",
                    }}
                  >
                    {a.label}
                  </p>
                  <p
                    style={{
                      fontFamily: FONT.family,
                      fontSize: 11,
                      color: "#888",
                      margin: 0,
                    }}
                  >
                    {a.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* ── Bottom: Activity + Alerts ── */}
          <div className="home-bottom">
            {/* Recent activity 
            <div className="home-card" style={{ padding: "20px 22px" }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#aaa",
                  marginBottom: 16,
                }}
              >
                Recent Activity
              </p>
              {ACTIVITY.map((a, i) => (
                <div key={i} className="home-activity-row">
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      flexShrink: 0,
                      background: `${a.color}14`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                    }}
                  >
                    {a.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontFamily: FONT.family,
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#222",
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {a.text}
                    </p>
                  </div>
                  <span
                    style={{
                      fontFamily: FONT.family,
                      fontSize: 11,
                      color: "#bbb",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.time}
                  </span>
                </div>
              ))}
            </div>
*/}
            {/* Alerts + shortcuts */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Alerts */}
              <div className="home-card" style={{ padding: "20px 22px" }}>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#aaa",
                    marginBottom: 14,
                  }}
                >
                  Alerts
                </p>
                {ALERTS.length === 0 ? (
                  <p
                    style={{
                      fontFamily: FONT.family,
                      fontSize: 13,
                      color: "#aaa",
                    }}
                  >
                    All clear ✓
                  </p>
                ) : (
                  ALERTS.map((al, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 12,
                        marginBottom: 8,
                        background: al.bg,
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{al.icon}</span>
                      <span
                        style={{
                          fontFamily: FONT.family,
                          fontSize: 13,
                          fontWeight: 500,
                          color: al.color,
                        }}
                      >
                        {al.text}
                      </span>
                    </div>
                  ))
                )}
                <button
                  onClick={() => navigate("/inventory")}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    padding: "9px 0",
                    background: "rgba(192,57,43,0.09)",
                    color: BRAND,
                    border: `1px solid rgba(192,57,43,0.20)`,
                    borderRadius: "50px",
                    fontFamily: FONT.family,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(192,57,43,0.15)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "rgba(192,57,43,0.09)")
                  }
                >
                  View Inventory →
                </button>
              </div>

              {/* App info card */}
              <div className="home-card" style={{ padding: "20px 22px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 14,
                      background: "rgba(192,57,43,0.10)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                    }}
                  >
                    🛍️
                  </div>
                  <div>
                    <p
                      style={{
                        fontFamily: FONT.family,
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#1a1a1a",
                        margin: 0,
                      }}
                    >
                      TheShop
                    </p>
                    <p
                      style={{
                        fontFamily: FONT.family,
                        fontSize: 11,
                        color: "#aaa",
                        margin: 0,
                      }}
                    >
                      Offline-first POS
                    </p>
                  </div>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {[
                    { label: "Works offline", on: true },
                    { label: "Sync when online", on: true },
                    //{ label: "Barcode scanner", on: true },
                    { label: "Cloud backup", on: false },
                  ].map((f) => (
                    <div
                      key={f.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: FONT.family,
                          fontSize: 12,
                          color: "#555",
                        }}
                      >
                        {f.label}
                      </span>
                      <span style={{ fontSize: 14 }}>{f.on ? "✅" : "⏳"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
