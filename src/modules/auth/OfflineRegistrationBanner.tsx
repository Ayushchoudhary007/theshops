// ─────────────────────────────────────────────────────────────
// src/modules/auth/OfflineRegistrationBanner.tsx
//
// Shown in two situations:
//   1. "offline-pending"  → owner registered offline, server not yet confirmed
//   2. "offline-only"     → any role logged in from local credential cache
//
// In both cases the user can do real work on this device.
// The banner just keeps them informed and offers to sync when online.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

const CSS = `
  @keyframes banner-slide-down { from{transform:translateY(-100%);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes banner-slide-up   { from{transform:translateY(0);opacity:1}     to{transform:translateY(-100%);opacity:0} }
  @keyframes spin              { to{transform:rotate(360deg)} }
  @keyframes pulse-dot         { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.8)} }

  .orb-banner {
    position:fixed; top:0; left:0; right:0; z-index:99999;
    animation:banner-slide-down .32s cubic-bezier(.34,1.3,.64,1) forwards;
    font-family:'Inter',sans-serif;
  }
  .orb-banner.hiding { animation:banner-slide-up .25s ease forwards; }

  .orb-inner {
    margin:8px 12px; border-radius:16px;
    backdrop-filter:blur(20px) saturate(200%);
    -webkit-backdrop-filter:blur(20px) saturate(200%);
    border:1px solid rgba(255,255,255,.25);
    box-shadow:0 4px 24px rgba(0,0,0,.15),inset 0 1px 0 rgba(255,255,255,.25);
    padding:11px 16px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;
  }

  .orb-spinner { width:16px;height:16px;flex-shrink:0; border:2px solid rgba(255,255,255,.30); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }
  .orb-dot     { width:8px;height:8px;border-radius:50%;flex-shrink:0; animation:pulse-dot 1.4s ease infinite; }

  .orb-text  { flex:1; min-width:0; }
  .orb-title { font-size:13px; font-weight:700; color:#fff; line-height:1.3; }
  .orb-sub   { font-size:11px; color:rgba(255,255,255,.72); margin-top:1px; }

  .orb-actions { display:flex; gap:6px; flex-shrink:0; flex-wrap:wrap; }
  .orb-btn {
    padding:5px 12px; border-radius:999px; font-size:12px; font-weight:700;
    font-family:'Inter',sans-serif; cursor:pointer; border:none;
    transition:opacity .13s,transform .10s; white-space:nowrap;
  }
  .orb-btn:hover  { opacity:.85; transform:translateY(-1px); }
  .orb-btn:active { transform:scale(.96); }
  .orb-btn.primary { background:#fff; color:inherit; }
  .orb-btn.ghost   { background:rgba(255,255,255,.20); color:#fff; border:1px solid rgba(255,255,255,.30); }
  .orb-close {
    width:24px; height:24px; border-radius:50%; flex-shrink:0;
    background:rgba(255,255,255,.15); border:none; cursor:pointer;
    color:rgba(255,255,255,.8); font-size:13px;
    display:flex; align-items:center; justify-content:center; transition:background .13s;
  }
  .orb-close:hover { background:rgba(255,255,255,.28); }
`;

type Variant = "offline-only" | "offline-pending" | "syncing" | "success" | "failed";

const STYLES: Record<Variant, { bg: string; dotColor: string }> = {
  "offline-only":    { bg: "rgba(109,40,217,0.88)", dotColor: "#c4b5fd" },
  "offline-pending": { bg: "rgba(180,83,9,0.88)",   dotColor: "#fbbf24" },
  "syncing":         { bg: "rgba(37,99,235,0.90)",   dotColor: "#93c5fd" },
  "success":         { bg: "rgba(21,128,61,0.90)",   dotColor: "#86efac" },
  "failed":          { bg: "rgba(185,28,28,0.90)",   dotColor: "#fca5a5" },
};

export function OfflineRegistrationBanner() {
  const navigate = useNavigate();
  const network  = useNetworkStatus();
  const auth     = useAuth();

  const [hiding,  setHiding]  = useState(false);
  const [visible, setVisible] = useState(false);

  // Determine which banner to show
  const variant: Variant = (() => {
    if (auth.syncResult === "syncing") return "syncing";
    if (auth.syncResult === "success") return "success";
    if (auth.syncResult === "failed")  return "failed";
    if (auth.status === "offline-only") return "offline-only";
    return "offline-pending";
  })();

  useEffect(() => {
    if (auth.status === "offline-pending" || auth.status === "offline-only") {
      setVisible(true);
      setHiding(false);
    }
  }, [auth.status]);

  // Auto-hide after success (session upgraded to linked)
  useEffect(() => {
    if (auth.syncResult === "success" || auth.status === "linked") {
      const t = setTimeout(() => {
        setHiding(true);
        setTimeout(() => setVisible(false), 300);
      }, 2800);
      return () => clearTimeout(t);
    }
  }, [auth.syncResult, auth.status]);

  if (!visible || auth.status === "linked" || auth.status === "guest") return null;

  const style     = STYLES[variant];
  const firstName = (auth.user?.name ?? auth.offlineAccount?.name ?? "").split(" ")[0];
  const lastSync  = auth.lastCachedAt
    ? `Last synced: ${new Date(auth.lastCachedAt).toLocaleString()}`
    : "Never synced on this device";

  const CONTENT: Record<Variant, { title: string; sub: string }> = {
    "offline-only": {
      title: `📵  Offline session, ${firstName}`,
      sub:   `Single-device mode — changes stay on this device. ${lastSync}.`,
    },
    "offline-pending": {
      title: `⚠️  Account not yet registered, ${firstName}`,
      sub:   "Created offline. Connect to the internet to sync across all devices.",
    },
    "syncing": {
      title: "Syncing with server…",
      sub:   "Syncing with server…",
    },
    "success": {
      title: "✅  Synced! Now in multi-device mode.",
      sub:   "Your account is live. Changes will sync across all devices.",
    },
    "failed": {
      title: "❌  Couldn't reach server",
      sub:   "Still working on this device. Will retry when connected.",
    },
  };

  const { title, sub } = CONTENT[variant];
  const canSync = network.isOnline && (auth.status === "offline-pending" || auth.status === "offline-only");

  return (
    <>
      <style>{CSS}</style>
      <div className={`orb-banner${hiding ? " hiding" : ""}`}>
        <div className="orb-inner" style={{ background: style.bg }}>
          {variant === "syncing"
            ? <div className="orb-spinner" />
            : <div className="orb-dot" style={{ background: style.dotColor }} />
          }

          <div className="orb-text">
            <div className="orb-title">{title}</div>
            <div className="orb-sub">{sub}</div>
          </div>

          <div className="orb-actions">
            {canSync && (
              <button
                className="orb-btn primary"
                style={{ color: variant === "offline-only" ? "#5b21b6" : "#b45309" }}
                onClick={() => auth.trySync()}
              >
                {variant === "offline-only" ? "Sync now" : "Register now"}
              </button>
            )}

            {(variant === "offline-pending" || variant === "offline-only") && (
              <button className="orb-btn ghost" onClick={() => navigate("/import-export?reason=offline")}>
                Export data
              </button>
            )}

            {variant === "failed" && (
              <button className="orb-btn primary" style={{ color: "#b91c1c" }} onClick={() => auth.trySync()}>
                Retry
              </button>
            )}

            {variant !== "syncing" && variant !== "success" && (
              <button className="orb-close" onClick={() => { setHiding(true); setTimeout(() => setVisible(false), 300); }}>
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
