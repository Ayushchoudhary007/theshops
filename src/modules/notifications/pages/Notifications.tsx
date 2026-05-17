// src/modules/notifications/pages/Notifications.tsx

import { useState, useEffect, useCallback } from "react";
import { BRAND, GLASS, RADIUS, COLOR, GLOBAL_STYLES } from "../../../design-tokens";
import { NotificationService } from "../notifications.service";
import type { Notification, NotifType } from "../notifications.types";
import { NOTIF_META } from "../notifications.types";

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "all",    label: "All"    },
  { key: "server", label: "Server" },
  { key: "client", label: "Client" },
  { key: "bill",   label: "Bills"  },
  { key: "alert",  label: "Alerts" },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function Notifications() {
  const [notifs,   setNotifs]   = useState<Notification[]>([]);
  const [filter,   setFilter]   = useState("all");
  const [selected, setSelected] = useState<Notification | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [reply,    setReply]    = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await NotificationService.list({
      type: filter === "all" ? undefined : filter,
    });
    setNotifs(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  // Seed demo notifications on first load
  useEffect(() => {
    (async () => {
      const count = await NotificationService.unreadCount();
      if (count === 0 && notifs.length === 0) {
        await NotificationService.createServerMessage(
          "POS system updated",
          "TheShop POS v2.4 is now running. All modules are online. Sync engine is active.",
          "normal"
        );
        await NotificationService.createServerMessage(
          "Low stock alert",
          "Basmati Rice (5 kg) has dropped below the reorder threshold. Current stock: 3 units.",
          "high"
        );
        await NotificationService.createClientMessage(
          "Day opening complete",
          "Opening cash float of ₹1,000 recorded by Suresh at 8:00 AM. All systems OK."
        );
        await load();
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openNotif(n: Notification) {
    setSelected(n);
    if (!n.is_read) {
      await NotificationService.markRead(n.id);
      setNotifs(prev =>
        prev.map(x => x.id === n.id ? { ...x, is_read: 1 } : x)
      );
    }
  }

  async function handleMarkAllRead() {
    await NotificationService.markAllRead();
    setNotifs(prev => prev.map(x => ({ ...x, is_read: 1 })));
  }

  async function sendReply() {
    if (!reply.trim() || !selected) return;
    await NotificationService.createClientMessage(
      `Reply: ${selected.title}`,
      reply.trim()
    );
    setReply("");
    await load();
  }

  const unread = notifs.filter(n => !n.is_read).length;
  const meta   = selected ? NOTIF_META[selected.type as NotifType] : null;

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <style>{`
        .notif-item { transition: background 0.12s; }
        .notif-item:hover { background: rgba(255,255,255,0.55) !important; }
        .notif-item.active-item { background: rgba(192,57,43,0.07) !important; border-left: 3px solid ${BRAND} !important; }
        .filter-chip { transition: all 0.15s; }
        .filter-chip:hover { background: rgba(255,255,255,0.70) !important; }
        .filter-chip.active-chip { background: ${BRAND} !important; color: #fff !important; }
        textarea { resize: none; }
        .scroll-list::-webkit-scrollbar { width: 4px; }
        .scroll-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
      `}</style>

      <div style={{
        display: "flex", height: "100vh", overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
        background: "linear-gradient(135deg,#fce4e4 0%,#fde8d8 20%,#fef9c3 40%,#dcfce7 60%,#dbeafe 80%,#ede9fe 100%)",
        backgroundAttachment: "fixed",
      }}>

        {/* ── LEFT: list ─────────────────────────────── */}
        <div style={{
          width: 340, display: "flex", flexDirection: "column",
          borderRight: "1px solid rgba(255,255,255,0.55)",
          ...GLASS, borderRadius: 0,
        }}>
          {/* Header */}
          <div style={{ padding: "16px 18px 10px", borderBottom: "1px solid rgba(255,255,255,0.45)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: COLOR.text }}>Notifications</h2>
                {unread > 0 && (
                  <span style={{ fontSize: 12, color: BRAND }}>
                    {unread} unread
                  </span>
                )}
              </div>
              <button
                onClick={handleMarkAllRead}
                style={{
                  fontSize: 11, color: BRAND, border: "none",
                  cursor: "pointer", fontFamily: "'Inter', sans-serif", padding: "4px 8px",
                  borderRadius: RADIUS.pill, background: "rgba(192,57,43,0.08)",
                }}
              >
                Mark all read
              </button>
            </div>

            {/* Filter chips */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`filter-chip ${filter === f.key ? "active-chip" : ""}`}
                  onClick={() => setFilter(f.key)}
                  style={{
                    fontSize: 11, fontWeight: 500, padding: "4px 10px",
                    border: "1px solid rgba(255,255,255,0.65)",
                    borderRadius: RADIUS.pill, cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                    background: filter === f.key ? BRAND : "rgba(255,255,255,0.45)",
                    color: filter === f.key ? "#fff" : COLOR.textMid,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="scroll-list" style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: COLOR.textSoft, fontSize: 13 }}>
                Loading…
              </div>
            ) : notifs.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
                <div style={{ fontSize: 13, color: COLOR.textSoft }}>No notifications</div>
              </div>
            ) : notifs.map(n => {
              const m = NOTIF_META[n.type as NotifType];
              return (
                <div
                  key={n.id}
                  className={`notif-item ${selected?.id === n.id ? "active-item" : ""}`}
                  onClick={() => openNotif(n)}
                  style={{
                    display: "flex", gap: 10, padding: "11px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.35)",
                    cursor: "pointer", alignItems: "flex-start",
                    borderLeft: "3px solid transparent",
                    background: selected?.id === n.id
                      ? "rgba(192,57,43,0.07)"
                      : "transparent",
                  }}
                >
                  {/* Unread dot */}
                  <div style={{
                    width: 7, height: 7, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                    background: n.is_read ? "rgba(0,0,0,0.15)" : BRAND,
                  }} />

                  {/* Icon */}
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    background: m.bgColor, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 14,
                  }}>
                    {m.icon}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: n.is_read ? 400 : 600, color: COLOR.text,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {n.title}
                    </div>
                    <div style={{
                      fontSize: 11, color: COLOR.textSoft, marginTop: 2,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {n.body}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                      <span style={{
                        fontSize: 9, fontWeight: 600, padding: "2px 6px",
                        borderRadius: RADIUS.badge, background: m.bgColor, color: m.color,
                        textTransform: "uppercase", letterSpacing: "0.05em",
                      }}>
                        {m.label}
                      </span>
                      <span style={{ fontSize: 10, color: COLOR.textFaint }}>
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: detail ──────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {selected && meta ? (
            <>
              {/* Detail header */}
              <div style={{
                padding: "16px 24px",
                ...GLASS, borderRadius: 0,
                borderBottom: "1px solid rgba(255,255,255,0.50)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: "3px 10px",
                    borderRadius: RADIUS.badge, background: meta.bgColor, color: meta.color,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>
                    {meta.icon} {meta.label}
                  </span>
                  {selected.priority === "high" && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px",
                      borderRadius: RADIUS.badge, background: "rgba(239,68,68,0.12)", color: "#b91c1c",
                    }}>
                      ⚠ High priority
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: COLOR.textSoft, marginLeft: "auto" }}>
                    {timeAgo(selected.createdAt)}
                  </span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: COLOR.text }}>
                  {selected.title}
                </h3>
              </div>

              {/* Body */}
              <div className="scroll-list" style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                {/* Message card */}
                <div style={{
                  ...GLASS, borderRadius: RADIUS.card, padding: 20, marginBottom: 16,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: COLOR.textSoft, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                    {selected.type === "server" ? "Server message" :
                     selected.type === "client" ? "Client generated" :
                     selected.type === "bill"   ? "Bill notification" : "System alert"}
                  </div>
                  <div style={{ fontSize: 14, color: COLOR.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {selected.body}
                  </div>
                </div>

                {/* Actions */}
                {selected.type !== "server" && (
                  <div style={{ ...GLASS, borderRadius: RADIUS.card, padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLOR.textSoft, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                      Actions
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {selected.type === "bill" && (
                        <button className="iv-btn-ghost" style={{ fontSize: 12 }}>
                          View bill
                        </button>
                      )}
                      {selected.type === "alert" && (
                        <button className="iv-btn-ghost" style={{ fontSize: 12 }}>
                          View inventory
                        </button>
                      )}
                      <button
                        className="iv-btn-danger"
                        style={{ fontSize: 12 }}
                        onClick={async () => {
                          await NotificationService.delete(selected.id);
                          setSelected(null);
                          await load();
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Compose bar — for client/bill notifications */}
              {selected.type !== "server" && (
                <div style={{
                  ...GLASS, borderRadius: 0, padding: "12px 20px",
                  borderTop: "1px solid rgba(255,255,255,0.50)",
                  display: "flex", gap: 10, alignItems: "flex-end",
                }}>
                  <textarea
                    className="iv-input"
                    rows={2}
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder="Type a note or reply…"
                    style={{ flex: 1 }}
                    onKeyDown={e => {
                      if (e.key === "Enter" && e.ctrlKey) {
                        e.preventDefault();
                        void sendReply();
                      }
                    }}
                  />
                  <button className="iv-btn-primary" onClick={() => void sendReply()}>
                    Send
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 12, color: COLOR.textSoft,
            }}>
              <span style={{ fontSize: 40 }}>💬</span>
              <div style={{ fontSize: 14 }}>Select a notification to view details</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
