// ─────────────────────────────────────────────────────────────
// src/components/navbar/MenuSlide.tsx
// ─────────────────────────────────────────────────────────────

import React from "react";

const InventoryIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const BillingIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const SettingsIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const ReportIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const CustomersIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export interface MenuOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  desc: string;
  color: string;
}

export interface MenuSlideProps {
  open: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export const menuOptions: MenuOption[] = [
  {
    id: "inventory",
    label: "Inventory",
    icon: <InventoryIcon />,
    desc: "Manage stock & items",
    color: "#3b82f6",
  },
  {
    id: "billing",
    label: "Billing",
    icon: <BillingIcon />,
    desc: "Invoices & payments",
    color: "#8b5cf6",
  },
  {
    id: "customers",
    label: "Customers",
    icon: <CustomersIcon />,
    desc: "Customer records",
    color: "#06b6d4",
  },
  {
    id: "report",
    label: "Reports",
    icon: <ReportIcon />,
    desc: "Analytics & exports",
    color: "#10b981",
  },
  {
    id: "import-export",
    label: "Import / Export",
    icon: <span style={{ fontSize: 18 }}>⇅</span>,
    desc: "Backup & transfer data",
    color: "#f59e0b",
  },
  {
    id: "settings",
    label: "Settings",
    icon: <SettingsIcon />,
    desc: "App preferences",
    color: "#6b7280",
  },
  {
    id: "login",
    label: "Sign In",
    icon: <span style={{ fontSize: 18 }}>🔑</span>,
    desc: "Link to your server",
    color: "#c0392b",
  },
];

const MENU_STYLES = `
  .ms-desktop {
    position: fixed;
    top: 92px;
    right: max(24px, calc((100% - 860px) / 2 + 24px));
    width: 300px;
    background: rgba(255,255,255,0.45);
    backdrop-filter: blur(24px) saturate(210%);
    -webkit-backdrop-filter: blur(24px) saturate(210%);
    border: 1px solid rgba(255,255,255,0.65);
    border-radius: 22px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.13), inset 0 1px 0 rgba(255,255,255,0.6);
    padding: 10px;
    z-index: 10000;
    transform-origin: top right;
    animation: ms-slide-down 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards;
    display: none;
  }

  .ms-mobile {
    position: fixed;
    bottom: 98px;
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 40px);
    max-width: 480px;
    background: rgba(255,255,255,0.45);
    backdrop-filter: blur(24px) saturate(210%);
    -webkit-backdrop-filter: blur(24px) saturate(210%);
    border: 1px solid rgba(255,255,255,0.65);
    border-radius: 22px;
    box-shadow: 0 -8px 40px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.6);
    padding: 10px;
    z-index: 10000;
    transform-origin: bottom center;
    animation: ms-slide-up 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards;
    display: flex;
  }

  @media (min-width: 769px) {
    .ms-desktop { display: block !important; }
    .ms-mobile  { display: none  !important; }
  }

  @keyframes ms-slide-down {
    from { opacity: 0; transform: translateY(-16px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes ms-slide-up {
    from { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.96); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  }

  .ms-item {
    display: flex; align-items: center; gap: 14px;
    width: 100%; padding: 11px 14px;
    background: none; border: none; cursor: pointer;
    border-radius: 14px; text-align: left;
    transition: background 0.15s, transform 0.12s;
  }
  .ms-item:hover  { background: rgba(255,255,255,0.55); transform: translateX(3px); }
  .ms-item:active { transform: scale(0.98); }

  .ms-item-card {
    flex-direction: column; align-items: flex-start;
    gap: 8px; padding: 14px 14px 12px;
  }
  .ms-item-card:hover { transform: translateY(-2px); }

  .ms-icon {
    width: 40px; height: 40px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  .ms-label { font-family:'Inter',sans-serif; font-size:14px; font-weight:600; color:#222; line-height:1.2; }
  .ms-desc  { font-family:'Inter',sans-serif; font-size:11px; color:#888; margin-top:1px; }
  .ms-chevron { margin-left:auto; color:#ccc; flex-shrink:0; }
  .ms-item:hover .ms-chevron { color:#999; }
  .ms-divider { height:1px; background:rgba(0,0,0,0.06); margin:4px 10px; }
`;

export default function MenuSlide({ open, onSelect, onClose }: MenuSlideProps) {
  if (!open) return null;

  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
  };

  return (
    <>
      <style>{MENU_STYLES}</style>

      {/* Desktop vertical list */}
      <div className="ms-desktop">
        {menuOptions.map((opt, i) => (
          <div key={opt.id}>
            <button className="ms-item" onClick={() => handleSelect(opt.id)}>
              <div
                className="ms-icon"
                style={{ background: `${opt.color}18`, color: opt.color }}
              >
                {opt.icon}
              </div>
              <div>
                <div className="ms-label">{opt.label}</div>
                <div className="ms-desc">{opt.desc}</div>
              </div>
              <svg
                className="ms-chevron"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            {i < menuOptions.length - 1 && <div className="ms-divider" />}
          </div>
        ))}
      </div>

      {/* Mobile 2-col card grid */}
      <div className="ms-mobile">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            width: "100%",
          }}
        >
          {menuOptions.map((opt) => (
            <button
              key={opt.id}
              className="ms-item ms-item-card"
              onClick={() => handleSelect(opt.id)}
            >
              <div
                className="ms-icon"
                style={{ background: `${opt.color}18`, color: opt.color }}
              >
                {opt.icon}
              </div>
              <div>
                <div className="ms-label">{opt.label}</div>
                <div className="ms-desc">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9998 }}
        onClick={onClose}
      />
    </>
  );
}
