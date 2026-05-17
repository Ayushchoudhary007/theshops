// src/modules/settings/Settings.tsx

import { useState, useEffect, useCallback } from "react";
import { GLASS, RADIUS, COLOR, GLOBAL_STYLES } from "../../design-tokens";
import { query, run } from "../../database";
import { NotificationService } from "../notifications/notifications.service";
import { useAuth } from "../auth/useAuth";
import { useSync } from "../auth/useSync";
import { ApiService } from "../../services/api.service";
import AccessSettings from "./AccessSettings";

interface MetaField {
  key:   string;
  label: string;
  type:  "text" | "number";
  hint?: string;
}

const SHOP_FIELDS: MetaField[] = [
  { key: "shop_name",    label: "Shop name",     type: "text",   hint: "Printed on bills" },
  { key: "shop_gst",     label: "GST number",    type: "text",   hint: "e.g. 08ABCDE1234F1Z5" },
  { key: "shop_address", label: "Address",       type: "text",   hint: "Printed on bills" },
  { key: "tax_rate",     label: "Default GST %", type: "number", hint: "e.g. 18 for 18%" },
];

// ── Sync status badge ─────────────────────────────────────────

function SyncStatusCard() {
  const sync = useSync();
  const auth = useAuth();
  const { syncState, pendingCount, lastSyncAt, triggerSync } = sync;

  const stateInfo: Record<string, { bg: string; border: string; color: string; text: string }> = {
    idle:    { bg: "rgba(21,128,61,.10)",  border: "rgba(21,128,61,.20)",  color: "#15803d", text: "All synced" },
    pending: { bg: "rgba(180,83,9,.10)",   border: "rgba(180,83,9,.20)",   color: "#b45309", text: `${pendingCount} change${pendingCount !== 1 ? "s" : ""} pending` },
    running: { bg: "rgba(37,99,235,.10)",  border: "rgba(37,99,235,.20)",  color: "#1d4ed8", text: "Syncing…" },
    done:    { bg: "rgba(21,128,61,.10)",  border: "rgba(21,128,61,.20)",  color: "#15803d", text: "Sync complete" },
    partial: { bg: "rgba(180,83,9,.10)",   border: "rgba(180,83,9,.20)",   color: "#b45309", text: "Partial sync" },
    error:   { bg: "rgba(185,28,28,.10)",  border: "rgba(185,28,28,.20)",  color: "#b91c1c", text: "Sync failed" },
  };

  const info = stateInfo[syncState] ?? { bg: "rgba(148,163,184,.10)", border: "rgba(148,163,184,.20)", color: "#64748b", text: "Checking…" };

  if (auth.status === "linked" && pendingCount === 0 && syncState === "idle") return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: info.bg, border: `1px solid ${info.border}`,
      borderRadius: 12, padding: "9px 14px", marginBottom: 16,
    }}>
      <div>
        <span style={{ fontSize: 12, fontWeight: 700, color: info.color }}>{info.text}</span>
        {lastSyncAt && (
          <span style={{ fontSize: 11, color: "#aaa", marginLeft: 8 }}>
            Last: {new Date(lastSyncAt).toLocaleTimeString()}
          </span>
        )}
        {auth.isOfflineSession && (
          <span style={{ fontSize: 11, color: "#b45309", marginLeft: 8, fontWeight: 600 }}>
            · Offline session
          </span>
        )}
      </div>
      {(syncState === "pending" || syncState === "error" || syncState === "partial") && (
        <button
          onClick={() => void triggerSync()}
          style={{
            background: info.color, color: "#fff", border: "none",
            borderRadius: 999, padding: "4px 12px", fontSize: 11,
            fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Sync now
        </button>
      )}
    </div>
  );
}

// ── Account card ──────────────────────────────────────────────

function AccountCard() {
  const auth = useAuth();
  const { user, status, isOfflineSession, lastCachedAt } = auth;
  if (!user && status === "guest") return null;

  const roleEmoji = user?.role === "owner" ? "👑" : user?.role === "manager" ? "🧑‍💼" : "🧑‍🔧";
  const roleBg    = user?.role === "owner" ? "rgba(180,83,9,.10)" : user?.role === "manager" ? "rgba(37,99,235,.10)" : "rgba(21,128,61,.10)";
  const roleColor = user?.role === "owner" ? "#92400e" : user?.role === "manager" ? "#1e40af" : "#166534";

  const statusInfo: Record<string, { label: string; color: string; bg: string }> = {
    linked:           { label: "Multi-device",   color: "#15803d", bg: "rgba(21,128,61,.10)"   },
    "offline-only":   { label: "Offline session", color: "#b45309", bg: "rgba(180,83,9,.10)"   },
    "offline-pending":{ label: "Pending sync",   color: "#1d4ed8", bg: "rgba(37,99,235,.10)"   },
    guest:            { label: "Guest",           color: "#6b7280", bg: "rgba(107,114,128,.10)" },
  };
  const si = statusInfo[status] ?? statusInfo.guest;

  return (
    <section style={{ ...GLASS, borderRadius: RADIUS.card, padding: "20px 24px", marginBottom: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: COLOR.text, marginBottom: 14 }}>Account</h2>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: roleBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
          {roleEmoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: COLOR.text }}>{user?.name ?? "Guest"}</span>
            {user?.role && (
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "capitalize", background: roleBg, color: roleColor, padding: "2px 8px", borderRadius: 999 }}>
                {user.role}
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: 700, background: si.bg, color: si.color, padding: "2px 8px", borderRadius: 999 }}>
              {si.label}
            </span>
          </div>
          <div style={{ fontSize: 12, color: COLOR.textSoft, marginTop: 2 }}>{user?.email}</div>
          {user?.shopName && (
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>
              🏪 {user.shopName}{user.shops && user.shops.length > 1 && ` + ${user.shops.length - 1} more`}
            </div>
          )}
          {lastCachedAt && isOfflineSession && (
            <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 1 }}>
              Last online: {new Date(lastCachedAt).toLocaleString()}
            </div>
          )}
        </div>
      </div>
      {isOfflineSession && (
        <div style={{ marginTop: 12, padding: "9px 12px", borderRadius: 10, background: "rgba(180,83,9,.08)", border: "1px solid rgba(180,83,9,.20)", fontSize: 12, color: "#b45309", lineHeight: 1.5 }}>
          📵 Offline mode. Changes are saved locally and will sync when you reconnect.
        </div>
      )}
      {user && (
        <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
          <button className="iv-btn-ghost" onClick={() => auth.logout()}>Sign out</button>
          {isOfflineSession && (
            <button className="iv-btn-ghost" style={{ color: "#b91c1c" }} onClick={() => auth.logoutAndForget()}>
              Forget this device
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// ── Main Settings ─────────────────────────────────────────────

export default function Settings() {
  const auth = useAuth();
  const [meta,   setMeta]   = useState<Record<string, string>>({});
  const [saved,  setSaved]  = useState(false);
  const [toast,  setToast]  = useState<string | null>(null);
  const [dbInfo, setDbInfo] = useState<Record<string, number>>({});

  const loadData = useCallback(async () => {
    const rows = await query<{ key: string; value: string }>("SELECT key, value FROM meta");
    const map: Record<string, string> = {};
    rows.forEach(r => (map[r.key] = r.value));
    setMeta(map);

    const tables = ["inventory", "bills", "bill_items", "customers", "notifications", "sync_queue"];
    const counts: Record<string, number> = {};
    for (const t of tables) {
      try {
        const r = await query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t}`);
        counts[t] = r[0]?.n ?? 0;
      } catch { counts[t] = 0; }
    }
    setDbInfo(counts);
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleSave() {
    // 1. Save to local SQLite
    for (const field of SHOP_FIELDS) {
      await run("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", [field.key, meta[field.key] ?? ""]);
    }

    // 2. Push to server if online and logged in
    const user = auth.user;
    const shopId = user?.shops?.[0]?.id ?? user?.shopId;
    if (user && user.token !== "offline" && shopId) {
      try {
        await ApiService.patch("/api/settings", {
          shopId,
          shopName:    meta["shop_name"]    ?? "",
          shopAddress: meta["shop_address"] ?? "",
          shopGst:     meta["shop_gst"]     ?? "",
          taxRate:     Number(meta["tax_rate"] ?? 18),
        });
        showToast("Settings saved & synced ✓");
      } catch {
        showToast("Settings saved locally (server sync failed)");
      }
    } else {
      showToast("Settings saved ✓");
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function sendTestNotif() {
    await NotificationService.createServerMessage(
      "Test notification",
      "This is a test server message sent from Settings.",
      "normal"
    );
    showToast("Test notification sent");
  }

  async function sendTestAlert() {
    await NotificationService.createAlert(
      "Stock alert test",
      "This is a simulated low-stock alert."
    );
    showToast("Test alert sent");
  }

  const canEditShop   = auth.isOwner || auth.can("settings:edit");
  const canViewAccess = auth.isOwner || (auth.isManager && auth.can("staff:create"));

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#1a1a1a", color: "#fff", padding: "10px 20px",
          borderRadius: RADIUS.pill, fontSize: 13, zIndex: 200,
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        }}>
          {toast}
        </div>
      )}

      <div style={{
        minHeight: "100vh", padding: "28px 20px",
        fontFamily: "'Inter', sans-serif",
        background: "linear-gradient(135deg,#fce4e4 0%,#fde8d8 20%,#fef9c3 40%,#dcfce7 60%,#dbeafe 80%,#ede9fe 100%)",
        backgroundAttachment: "fixed",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: COLOR.text, marginBottom: 20 }}>Settings</h1>

          <SyncStatusCard />
          <AccountCard />

          {canEditShop && (
            <section style={{ ...GLASS, borderRadius: RADIUS.card, padding: "20px 24px", marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: COLOR.text, marginBottom: 16 }}>Shop information</h2>
              {SHOP_FIELDS.map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: COLOR.textSoft, marginBottom: 4 }}>
                    {f.label}
                    {f.hint && <span style={{ fontWeight: 400, marginLeft: 6, color: COLOR.textFaint }}>— {f.hint}</span>}
                  </div>
                  <input
                    className="iv-input"
                    type={f.type}
                    value={meta[f.key] ?? ""}
                    onChange={e => setMeta(m => ({ ...m, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
              <button
                className={saved ? "iv-btn-ghost" : "iv-btn-primary"}
                onClick={() => void handleSave()}
                style={{ marginTop: 4 }}
              >
                {saved ? "✓ Saved" : "Save settings"}
              </button>
            </section>
          )}

          {canViewAccess && <AccessSettings />}

          <section style={{ ...GLASS, borderRadius: RADIUS.card, padding: "20px 24px", marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: COLOR.text, marginBottom: 6 }}>Notifications</h2>
            <p style={{ fontSize: 13, color: COLOR.textSoft, marginBottom: 14, lineHeight: 1.6 }}>
              Send test notifications to verify the system is working.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="iv-btn-ghost" onClick={() => void sendTestNotif()}>🖥️ Send server message</button>
              <button className="iv-btn-ghost" onClick={() => void sendTestAlert()}>🔔 Send stock alert</button>
            </div>
          </section>

          <section style={{ ...GLASS, borderRadius: RADIUS.card, padding: "20px 24px", marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: COLOR.text, marginBottom: 14 }}>Database</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {Object.entries(dbInfo).map(([table, count]) => (
                <div key={table} style={{ background: "rgba(255,255,255,0.35)", borderRadius: RADIUS.item, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: COLOR.textSoft, textTransform: "capitalize" }}>{table.replace(/_/g, " ")}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: COLOR.text }}>{count}</span>
                </div>
              ))}
            </div>
          </section>

          <section style={{ ...GLASS, borderRadius: RADIUS.card, padding: "16px 24px" }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: COLOR.text, marginBottom: 8 }}>About</h2>
            <div style={{ fontSize: 12, color: COLOR.textSoft, lineHeight: 1.8 }}>
              <div>TheShop POS · v4.0</div>
              <div>Offline-first · SQLite local · PostgreSQL server · React + Capacitor</div>
              <div>Server: v4 (Prisma + PostgreSQL)</div>
              <div style={{ marginTop: 4, color: COLOR.textFaint }}>
                Modules: Inventory · Billing · Customers · Reports · Notifications · Access
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
