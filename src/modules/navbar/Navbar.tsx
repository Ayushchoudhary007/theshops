// ─────────────────────────────────────────────────────────────
// src/components/navbar/Navbar.tsx
//
// Floating glassmorphism pill navbar — desktop top, mobile bottom.
// Uses react-router-dom for navigation instead of local state.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import MenuSlide from "./MenuSlide";

/* ── Icons ───────────────────────────────────────────────── */
const LogoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
    <rect
      x="3"
      y="7"
      width="22"
      height="16"
      rx="2"
      stroke="#c0392b"
      strokeWidth="2"
    />
    <path
      d="M9 7V6a5 5 0 0 1 10 0v1"
      stroke="#c0392b"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="14" cy="15" r="2" fill="#c0392b" />
  </svg>
);

// const SearchIcon = () => (
//   <svg
//     width="19"
//     height="19"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <circle cx="11" cy="11" r="8" />
//     <line x1="21" y1="21" x2="16.65" y2="16.65" />
//   </svg>
// );

const BellIcon = () => (
  <span style={{ position: "relative", display: "inline-flex" }}>
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
    <span
      style={{
        position: "absolute",
        top: -2,
        right: -2,
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: "#e67e22",
        border: "1.5px solid white",
      }}
    />
  </span>
);

const HomeIcon = () => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const InventoryIcon = () => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
  </svg>
);

const MenuIcon = ({ open }: { open: boolean }) => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transition: "transform 0.3s",
      transform: open ? "rotate(90deg)" : "rotate(0deg)",
    }}
  >
    {open ? (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ) : (
      <>
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </>
    )}
  </svg>
);

/* ── Mobile tab config ───────────────────────────────────── */
const MOBILE_TABS = [
  { id: "home", label: "Home", path: "/", icon: <HomeIcon /> },
  {
    id: "inventory",
    label: "Inventory",
    path: "/inventory",
    icon: <InventoryIcon />,
  },
  //{ id: "search", label: "Search", path: null, icon: <SearchIcon /> },
  { id: "bell", label: "Alerts", path: "/notifications", icon: <BellIcon /> },
  { id: "menu", label: "Menu", path: null, icon: null },
] as const;

/* ── Styles ──────────────────────────────────────────────── */
const NAV_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  /* Shared floating pill */
  .kn-pill {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    background: rgba(255,255,255,0.28);
    backdrop-filter: blur(18px) saturate(200%);
    -webkit-backdrop-filter: blur(18px) saturate(200%);
    border: 1px solid rgba(255,255,255,0.60);
    border-radius: 999px;
    box-shadow: 0 4px 30px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.55);
    display: flex;
    align-items: center;
    isolation: isolate;
  }

  /* Desktop — top */
  .kn-desktop {
    top: 18px;
    width: calc(100% - 48px);
    max-width: 860px;
    height: 56px;
    padding: 0 14px;
    justify-content: space-between;
    display: none;
  }

  /* Mobile — bottom */
  .kn-mobile {
    bottom: 18px;
    width: calc(100% - 40px);
    max-width: 480px;
    height: 62px;
    padding: 0 8px;
    justify-content: space-around;
    display: flex;
  }

  @media (min-width: 769px) {
    .kn-desktop { display: flex !important; }
    .kn-mobile  { display: none  !important; }
  }

  /* Desktop nav links */
  .kn-link {
    background: none; border: none; cursor: pointer;
    padding: 6px 12px; border-radius: 50px; color: #555;
    display: flex; align-items: center; gap: 6px;
    font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
    transition: background 0.15s, color 0.15s;
    text-decoration: none;
    white-space: nowrap;
  }
  .kn-link:hover, .kn-link.on {
    background: rgba(192,57,43,0.10); color: #c0392b;
  }

  /* Desktop icon button */
  .kn-btn {
    background: none; border: none; cursor: pointer;
    padding: 7px 10px; border-radius: 50px; color: #444;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, color 0.15s;
  }
  .kn-btn:hover, .kn-btn.on {
    background: rgba(192,57,43,0.10); color: #c0392b;
  }

  /* Mobile tab */
  .kn-tab {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 3px; padding: 5px 4px; cursor: pointer;
    color: #888; background: none; border: none;
    font-family: 'Inter', sans-serif; font-size: 9px;
    letter-spacing: 0.04em; border-radius: 50px;
    transition: color 0.15s, background 0.15s;
  }
  .kn-tab:hover, .kn-tab.on {
    color: #c0392b; background: rgba(192,57,43,0.10);
  }

  /* Avatar */
  .kn-avatar {
    width: 30px; height: 30px; border-radius: 50%;
    background: linear-gradient(135deg, #27ae60 55%, #1abc9c);
    color: #fff; font-weight: 700; font-size: 13px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; border: 2px solid rgba(255,255,255,0.8);
    font-family: Georgia, serif; flex-shrink: 0;
    transition: border-color 0.15s;
  }
  .kn-avatar.on { border-color: #c0392b; }

  .kn-divider { width:1px; height:20px; background:rgba(0,0,0,0.12); margin:0 4px; flex-shrink:0; }
`;

/* ── Component ───────────────────────────────────────────── */
export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const path = location.pathname;

  const handleMenuSelect = (id: string) => {
    const routes: Record<string, string> = {
      inventory: "/inventory",
      billing: "/billing",
      report: "/report",
      settings: "/settings",
      home: "/",
      "import-export": "/import-export",
      login: "/login",
      customers: "/customers",
    };
    if (routes[id]) navigate(routes[id]);
  };

  return (
    <>
      <style>{NAV_STYLES}</style>

      {/* ══ DESKTOP NAV ══ */}
      <nav className="kn-pill kn-desktop">
        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            cursor: "pointer",
          }}
          onClick={() => navigate("/")}
        >
          <LogoIcon />
          <div>
            <div
              style={{
                fontFamily: "'Inter',sans-serif",
                fontSize: 15,
                fontWeight: 700,
                color: "#c0392b",
                lineHeight: 1.1,
              }}
            >
              TheShop
            </div>
            <div
              style={{
                fontSize: 8.5,
                color: "#bbb",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              POS & Inventory
            </div>
          </div>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button
            className={`kn-link${path === "/" ? " on" : ""}`}
            onClick={() => navigate("/")}
          >
            <HomeIcon /> Home
          </button>
          <button
            className={`kn-link${path === "/inventory" ? " on" : ""}`}
            onClick={() => navigate("/inventory")}
          >
            <InventoryIcon /> Inventory
          </button>
          <button
            className={`kn-link${path === "/billing" ? " on" : ""}`}
            onClick={() => navigate("/billing")}
          >
            Billing
          </button>
          <button
            className={`kn-link${path === "/report" ? " on" : ""}`}
            onClick={() => navigate("/report")}
          >
            Reports
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* <button className="kn-btn">
        <SearchIcon />
      </button> */}
          <div className="kn-divider" />
          <button className="kn-btn" onClick={() => navigate("/notifications")}>
            <BellIcon />
          </button>
          {/* <div className="kn-avatar">A</div> */}
          <div className="kn-divider" />
          <button
            className={`kn-btn${menuOpen ? " on" : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </nav>

      {/* ══ MOBILE NAV ══ */}
      <nav className="kn-pill kn-mobile">
        {MOBILE_TABS.map((tab) => {
          const isMenu = tab.id === "menu";
          const on = isMenu ? menuOpen : tab.path ? path === tab.path : false;

          return (
            <button
              key={tab.id}
              className={`kn-tab${on ? " on" : ""}`}
              onClick={() => {
                if (isMenu) {
                  setMenuOpen((o) => !o);
                } else if (tab.path) {
                  navigate(tab.path);
                  setMenuOpen(false);
                }
              }}
            >
              {isMenu ? <MenuIcon open={menuOpen} /> : tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <MenuSlide
        open={menuOpen}
        onSelect={handleMenuSelect}
        onClose={() => setMenuOpen(false)}
      />
    </>
  );
}
