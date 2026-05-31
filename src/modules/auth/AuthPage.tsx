// src/modules/auth/AuthPage.tsx
//
// LOGIN  → all roles. Online → server. Offline → local credential cache.
// REGISTER → owner only. Online → server. Offline → local draft.
//
// Server URL is never shown or entered — it comes from VITE_API_URL.

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService } from "./auth.service";
import { syncEngine } from "../../sync/sync.engine.client";
import { SubAccountService } from "./sub_account.service";
import { CredentialStore, UserStore } from "./auth.storage";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import type { AuthTab, LoginForm, RegisterForm } from "./auth.types";

const BRAND = "#c0392b";
const FONT  = "'Inter', sans-serif";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; }

  .ap-bg {
    min-height: 100vh;
    background: linear-gradient(135deg,#fce4e4 0%,#fde8d8 18%,#fef9c3 36%,#dcfce7 54%,#dbeafe 72%,#ede9fe 100%);
    display: flex; align-items: center; justify-content: center;
    padding: 24px 16px; font-family: ${FONT};
    position: relative; overflow: hidden;
  }
  .ap-blob { position:absolute; border-radius:50%; pointer-events:none; z-index:0; filter:blur(60px); opacity:.35; }

  .ap-card {
    position:relative; z-index:1; width:100%; max-width:480px;
    background:rgba(255,255,255,.52);
    backdrop-filter:blur(28px) saturate(220%);
    -webkit-backdrop-filter:blur(28px) saturate(220%);
    border:1px solid rgba(255,255,255,.70);
    box-shadow:0 24px 64px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,255,.70);
    border-radius:28px; padding:34px 34px 30px;
    animation:ap-rise .32s cubic-bezier(.34,1.3,.64,1) forwards;
  }
  @keyframes ap-rise { from{opacity:0;transform:translateY(20px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  @media(max-width:480px){.ap-card{padding:26px 20px 22px;border-radius:22px}}

  .ap-net { display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:12px;margin-bottom:20px; }
  .ap-net.offline { background:rgba(180,83,9,.10); border:1px solid rgba(180,83,9,.22); }
  .ap-net.online  { background:rgba(21,128,61,.10); border:1px solid rgba(21,128,61,.22); }

  /* Server status pill */
  .srv-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;}
  .srv-pill .dot{width:6px;height:6px;border-radius:50%;}
  .srv-pill.chk{background:rgba(148,163,184,.15);color:#64748b;}
  .srv-pill.chk .dot{background:#94a3b8;animation:pdot 1.2s infinite;}
  .srv-pill.ok{background:rgba(34,197,94,.12);color:#15803d;}
  .srv-pill.ok .dot{background:#22c55e;}
  .srv-pill.err{background:rgba(239,68,68,.10);color:#b91c1c;}
  .srv-pill.err .dot{background:#ef4444;}
  @keyframes pdot{0%,100%{opacity:1}50%{opacity:.3}}

  .ap-tabs { display:flex;background:rgba(255,255,255,.38);border:1px solid rgba(255,255,255,.65);border-radius:999px;padding:4px;margin-bottom:24px; }
  .ap-tab { flex:1;border:none;cursor:pointer;outline:none;padding:9px 16px;border-radius:999px;font-family:${FONT};font-size:14px;font-weight:600;transition:all .22s;background:transparent;color:#999; }
  .ap-tab.on { background:#fff;color:${BRAND};box-shadow:0 2px 12px rgba(0,0,0,.10); }

  .ap-info { padding:12px 14px;border-radius:14px;display:flex;gap:10px;align-items:flex-start; }
  .ap-info.blue   { background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.20); }
  .ap-info.amber  { background:rgba(180,83,9,.08);border:1px solid rgba(180,83,9,.20); }
  .ap-info.green  { background:rgba(21,128,61,.08);border:1px solid rgba(21,128,61,.20); }

  .ap-hier-row { display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(0,0,0,.05);font-size:12px; }
  .ap-hier-row:last-child{border-bottom:none;}
  .ap-hier-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}
  .ap-hier-indent{width:16px;flex-shrink:0;}

  .ap-field{display:flex;flex-direction:column;gap:5px;}
  .ap-label{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#888;}
  .ap-input{
    width:100%;background:rgba(255,255,255,.65);border:1.5px solid rgba(255,255,255,.78);
    border-radius:12px;padding:11px 14px;font-family:${FONT};font-size:14px;color:#1a1a1a;
    outline:none;transition:border-color .15s,box-shadow .15s;backdrop-filter:blur(8px);
  }
  .ap-input:focus{border-color:rgba(192,57,43,.45);box-shadow:0 0 0 3px rgba(192,57,43,.10);}
  .ap-input::placeholder{color:#c0c0c0;}
  .ap-input.err{border-color:rgba(239,68,68,.50);box-shadow:0 0 0 3px rgba(239,68,68,.09);}

  .ap-wrap{position:relative;}
  .ap-wrap .ap-input{padding-left:40px;}
  .ap-wrap .ai{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#ccc;pointer-events:none;display:flex;align-items:center;}
  .ap-wrap .eye{position:absolute;right:12px;top:50%;transform:translateY(-50%);cursor:pointer;color:#ccc;background:none;border:none;padding:0;display:flex;align-items:center;}
  .ap-wrap .eye:hover{color:#888;}

  .ap-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  @media(max-width:400px){.ap-g2{grid-template-columns:1fr;}}

  .owner-badge{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid rgba(180,83,9,.20);border-radius:999px;padding:5px 12px 5px 10px;font-size:12px;font-weight:700;color:#92400e;}

  .pw-bar{height:3px;border-radius:999px;background:rgba(0,0,0,.07);overflow:hidden;margin-top:5px;}
  .pw-fill{height:100%;border-radius:999px;transition:width .3s,background .3s;}

  .ap-submit{
    width:100%;padding:13px;background:${BRAND};color:#fff;border:none;border-radius:50px;
    font-family:${FONT};font-size:15px;font-weight:700;cursor:pointer;
    box-shadow:0 4px 16px rgba(192,57,43,.32);transition:all .15s;
    display:flex;align-items:center;justify-content:center;gap:8px;
  }
  .ap-submit:hover{background:#a93226;transform:translateY(-1px);}
  .ap-submit:active{transform:scale(.98);}
  .ap-submit:disabled{opacity:.55;cursor:not-allowed;transform:none;}
  .ap-submit.offline-mode{background:#1d4ed8;box-shadow:0 4px 16px rgba(29,78,216,.32);}

  @keyframes spin{to{transform:rotate(360deg)}}
  .ap-spin{width:17px;height:17px;border:2.5px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;}

  .ap-err{background:rgba(239,68,68,.10);border:1px solid rgba(239,68,68,.22);border-radius:12px;padding:10px 14px;font-size:13px;color:#b91c1c;display:flex;align-items:flex-start;gap:8px;}
  .ap-ok{background:rgba(34,197,94,.10);border:1px solid rgba(34,197,94,.22);border-radius:12px;padding:10px 14px;font-size:13px;color:#15803d;display:flex;align-items:flex-start;gap:8px;}

  .ap-cb-row{display:flex;align-items:center;gap:8px;cursor:pointer;}
  .ap-cb{width:17px;height:17px;border-radius:5px;border:1.5px solid rgba(0,0,0,.15);cursor:pointer;appearance:none;-webkit-appearance:none;background:rgba(255,255,255,.65);transition:all .13s;flex-shrink:0;position:relative;}
  .ap-cb:checked{background:${BRAND};border-color:${BRAND};}
  .ap-cb:checked::after{content:"✓";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-size:10px;font-weight:800;}

  .ap-divider{display:flex;align-items:center;gap:10px;color:#ccc;font-size:12px;}
  .ap-divider::before,.ap-divider::after{content:"";flex:1;height:1px;background:rgba(0,0,0,.07);}

  .ap-cached-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:12px;cursor:pointer;border:1.5px solid rgba(0,0,0,.07);background:rgba(255,255,255,.50);transition:all .15s;margin-bottom:6px;}
  .ap-cached-item:hover{border-color:rgba(192,57,43,.30);background:rgba(255,255,255,.75);}
  .ap-cached-avatar{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
`;

const Ic = {
  mail:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  lock:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  user:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  shop:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  eye:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  wifi:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>,
  wifiOff:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a11 11 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>,
};

function pwStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return ["", "Weak", "Fair", "Good", "Strong"][s];
}
function pwColor(s: string) {
  return ({ Weak:"#ef4444", Fair:"#f59e0b", Good:"#3b82f6", Strong:"#22c55e" } as Record<string,string>)[s] ?? "transparent";
}
function roleEmoji(role: string) { return role === "owner" ? "👑" : role === "manager" ? "🧑‍💼" : "🧑‍🔧"; }
function roleColor(role: string) { return role === "owner" ? "#92400e" : role === "manager" ? "#1e40af" : "#166534"; }

// ── Cached accounts quick-login ───────────────────────────────

function CachedAccountList({ onSelect }: { onSelect: (email: string) => void }) {
  const creds = CredentialStore.getAll();
  if (!creds.length) return null;
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 8px" }}>
        Accounts on this device
      </p>
      {creds.map(c => {
        const u   = c.userSnapshot;
        const ms  = Date.now() - new Date(c.cachedAt).getTime();
        const hrs = Math.floor(ms / 3_600_000);
        const ago = hrs < 1 ? "just now" : hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
        return (
          <div key={c.email} className="ap-cached-item" onClick={() => onSelect(c.email)}>
            <div className="ap-cached-avatar" style={{ background: `${roleColor(u.role)}18` }}>
              {roleEmoji(u.role)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</p>
              <p style={{ fontSize: 11, color: "#aaa", margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: roleColor(u.role), textTransform: "capitalize" }}>{u.role}</span>
              <p style={{ fontSize: 10, color: "#ccc", margin: "2px 0 0" }}>synced {ago}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HierarchyHint() {
  return (
    <div style={{ background: "rgba(0,0,0,.03)", border: "1px solid rgba(0,0,0,.07)", borderRadius: 14, padding: "12px 14px" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: ".07em", margin: "0 0 8px" }}>Who can sign in?</p>
      {[
        { indent: 0, icon: "👑", role: "Owner",   color: "#92400e", bg: "rgba(180,83,9,.10)",  sub: "Full authority over all shops" },
        { indent: 1, icon: "🧑‍💼", role: "Manager", color: "#1e40af", bg: "rgba(37,99,235,.10)", sub: "Sub-account created by owner" },
        { indent: 2, icon: "🧑‍🔧", role: "Staff",   color: "#166534", bg: "rgba(21,128,61,.10)", sub: "Restricted shop access" },
      ].map(({ indent, icon, role, color, bg, sub }) => (
        <div className="ap-hier-row" key={role}>
          {Array.from({ length: indent }).map((_, i) => <div className="ap-hier-indent" key={i} />)}
          <div className="ap-hier-icon" style={{ background: bg }}>{icon}</div>
          <div>
            <span style={{ fontWeight: 700, color, fontSize: 13 }}>{role}</span>
            <span style={{ color: "#aaa", fontSize: 11 }}> · {sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function AuthPage() {
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();

  const [tab,     setTab]     = useState<AuthTab>("login");
  const [showPw,  setShowPw]  = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  // Server status (auto-ping VITE_API_URL on mount)
  const [srvStatus, setSrvStatus] = useState<"idle" | "chk" | "ok" | "err">("idle");
  const [srvInfo,   setSrvInfo]   = useState<{ version?: string; latency?: number } | null>(null);

  const [login, setLogin] = useState<LoginForm>({ email: "", password: "", remember: true });
  const [reg,   setReg]   = useState<RegisterForm>({ name: "", email: "", password: "", confirmPassword: "", shopName: "" });

  const hasCachedCred = !!CredentialStore.getByEmail(login.email);
  const strength      = pwStrength(tab === "login" ? login.password : reg.password);

  // Auto-ping on mount and when coming online
  useEffect(() => {
    if (!isOnline) { setSrvStatus("err"); return; }
    setSrvStatus("chk"); setSrvInfo(null);
    AuthService.ping().then(r => {
      setSrvStatus(r.ok ? "ok" : "err");
      if (r.ok) setSrvInfo({ version: r.version, latency: r.latency });
    });
  }, [isOnline]);

  const handleCachedSelect = useCallback((email: string) => {
    setLogin(f => ({ ...f, email }));
  }, []);

  // ── Login ─────────────────────────────────────────────────

  const handleLogin = async () => {
    setError(""); setSuccess("");
    if (!login.email || !login.password) { setError("Please enter your email and password."); return; }
    setLoading(true);
    try {
      const { user, mode } = await AuthService.login(login);
      if (mode === "offline-only") {
        setSuccess("Signed in offline — data stays on this device until you reconnect.");
        setTimeout(() => navigate(user.role === "staff" ? "/billing" : "/"), 1200);
      } else {
        // Online — pull all server data before navigating
        setSuccess("Signed in! Syncing your data…");
        syncEngine.sync().catch(console.error);
        setTimeout(() => navigate(user.role === "staff" ? "/billing" : "/"), 800);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  // Offline manager/staff login using SubAccountService local cache
  const handleOfflineSubLogin = async () => {
    setError(""); setSuccess("");
    if (!login.email || !login.password) { setError("Please enter your email and password."); return; }
    setLoading(true);
    try {
      const account = await SubAccountService.verifyLocalLogin(login.email, login.password);
      if (!account) { setError("No offline credentials found for this account on this device."); setLoading(false); return; }
      const user = SubAccountService.buildOfflineUser(account);
      // UserStore is already imported at the top of this file via CredentialStore
      // Use auth.storage directly
      UserStore.set(user);
      navigate(user.role === "staff" ? "/billing" : "/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Offline login failed.");
    } finally {
      setLoading(false);
    }
  };

  // ── Register ──────────────────────────────────────────────

  const handleRegister = async () => {
    setError(""); setSuccess("");
    if (!reg.name || !reg.email || !reg.password || !reg.shopName) { setError("Please fill in all required fields."); return; }
    if (reg.password !== reg.confirmPassword) { setError("Passwords do not match."); return; }
    if (reg.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const result = await AuthService.register(reg, isOnline);
      if (result.kind === "linked") {
        navigate("/");
      } else {
        setSuccess("Shop created on this device! Will sync with the server when you reconnect.");
        setTimeout(() => navigate("/"), 2200);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="ap-bg">
        <div className="ap-blob" style={{ width: 380, height: 380, background: "#fde68a", top: -100, left: -80 }} />
        <div className="ap-blob" style={{ width: 300, height: 300, background: "#bfdbfe", bottom: -80, right: -60 }} />

        <div style={{ width: "100%", maxWidth: 480 }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 36, marginBottom: 4 }}>🏪</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1a1a1a", letterSpacing: "-0.03em", margin: 0 }}>TheShop</h1>
            <p style={{ fontSize: 12, color: "#aaa", margin: "4px 0 0" }}>Local-first · works offline</p>
          </div>

          <div className="ap-card">

            {/* Network + server status */}
            <div className={`ap-net ${isOnline ? "online" : "offline"}`}>
              <span style={{ fontSize: 16, display: "flex" }}>{isOnline ? Ic.wifi : Ic.wifiOff}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: isOnline ? "#15803d" : "#b45309", margin: 0 }}>
                  {isOnline ? "Online" : "Offline"}
                </p>
                <p style={{ fontSize: 11, color: isOnline ? "#166534" : "#92400e", margin: "2px 0 0" }}>
                  {isOnline
                    ? "Connected — data syncs across all devices."
                    : "Works on this device only. Connect to sync across devices."}
                </p>
              </div>
              {/* Server reachability pill — shown when online */}
              {isOnline && srvStatus !== "idle" && (
                <span className={`srv-pill ${srvStatus}`}>
                  <span className="dot" />
                  {srvStatus === "chk" && "Checking…"}
                  {srvStatus === "ok"  && `Server OK${srvInfo?.latency ? ` · ${srvInfo.latency}ms` : ""}${srvInfo?.version ? ` · v${srvInfo.version}` : ""}`}
                  {srvStatus === "err" && "Server unreachable"}
                </span>
              )}
            </div>

            {/* Tabs */}
            <div className="ap-tabs">
              <button className={`ap-tab${tab === "login" ? " on" : ""}`}    onClick={() => { setTab("login");    setError(""); setSuccess(""); }}>Sign In</button>
              <button className={`ap-tab${tab === "register" ? " on" : ""}`} onClick={() => { setTab("register"); setError(""); setSuccess(""); }}>Register Shop</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>

              {/* ── LOGIN ── */}
              {tab === "login" && (
                <>
                  <HierarchyHint />
                  <CachedAccountList onSelect={handleCachedSelect} />
                  {CredentialStore.getAll().length > 0 && <div className="ap-divider">or enter credentials manually</div>}

                  <div className="ap-field">
                    <label className="ap-label">Email</label>
                    <div className="ap-wrap">
                      <span className="ai">{Ic.mail}</span>
                      <input className="ap-input" type="email" value={login.email}
                        onChange={e => setLogin(f => ({ ...f, email: e.target.value }))}
                        placeholder="you@example.com" autoComplete="email"
                        onKeyDown={e => e.key === "Enter" && void handleLogin()} />
                    </div>
                    {!isOnline && hasCachedCred && (
                      <p style={{ fontSize: 11, color: "#15803d", margin: "3px 0 0", fontWeight: 600 }}>
                        ✓ Offline credentials available for this account
                      </p>
                    )}
                  </div>

                  <div className="ap-field">
                    <label className="ap-label">Password</label>
                    <div className="ap-wrap">
                      <span className="ai">{Ic.lock}</span>
                      <input className="ap-input" type={showPw ? "text" : "password"} value={login.password}
                        onChange={e => setLogin(f => ({ ...f, password: e.target.value }))}
                        placeholder="••••••••" autoComplete="current-password" style={{ paddingRight: 40 }}
                        onKeyDown={e => e.key === "Enter" && void handleLogin()} />
                      <button className="eye" onClick={() => setShowPw(s => !s)}>{showPw ? Ic.eyeOff : Ic.eye}</button>
                    </div>
                  </div>

                  <label className="ap-cb-row">
                    <input type="checkbox" className="ap-cb" checked={login.remember} onChange={e => setLogin(f => ({ ...f, remember: e.target.checked }))} />
                    <span style={{ fontSize: 13, color: "#555" }}>Keep me signed in on this device</span>
                  </label>

                  {!isOnline && (
                    <div className="ap-info amber">
                      <span style={{ fontSize: 18, flexShrink: 0 }}>📵</span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#b45309", margin: 0 }}>Offline login</p>
                        <p style={{ fontSize: 12, color: "#92400e", margin: "3px 0 0", lineHeight: 1.5 }}>
                          You must have logged in on this device at least once while online.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── REGISTER ── */}
              {tab === "register" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <span className="owner-badge">👑 Owner Registration</span>
                    <span style={{ fontSize: 11, color: "#aaa" }}>Managers &amp; staff added inside the app</span>
                  </div>

                  {isOnline ? (
                    <div className="ap-info green">
                      <span style={{ fontSize: 18, flexShrink: 0 }}>🌐</span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#15803d", margin: 0 }}>Multi-device mode</p>
                        <p style={{ fontSize: 12, color: "#166634", margin: "3px 0 0", lineHeight: 1.5 }}>
                          Your account will be registered with the server. All devices sync automatically.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="ap-info blue">
                      <span style={{ fontSize: 18, flexShrink: 0 }}>📵</span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8", margin: 0 }}>Single-device mode</p>
                        <p style={{ fontSize: 12, color: "#3b82f6", margin: "3px 0 0", lineHeight: 1.5 }}>
                          Your shop works fully on this device right away. Syncs when you connect to the internet.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="ap-divider">Create your owner account</div>

                  <div className="ap-g2">
                    <div className="ap-field">
                      <label className="ap-label">Full Name *</label>
                      <div className="ap-wrap">
                        <span className="ai">{Ic.user}</span>
                        <input className="ap-input" value={reg.name} onChange={e => setReg(f => ({ ...f, name: e.target.value }))} placeholder="Ravi Kumar" autoComplete="name" />
                      </div>
                    </div>
                    <div className="ap-field">
                      <label className="ap-label">Shop Name *</label>
                      <div className="ap-wrap">
                        <span className="ai">{Ic.shop}</span>
                        <input className="ap-input" value={reg.shopName} onChange={e => setReg(f => ({ ...f, shopName: e.target.value }))} placeholder="Ravi Electronics" />
                      </div>
                    </div>
                  </div>

                  <div className="ap-field">
                    <label className="ap-label">Email *</label>
                    <div className="ap-wrap">
                      <span className="ai">{Ic.mail}</span>
                      <input className="ap-input" type="email" value={reg.email} onChange={e => setReg(f => ({ ...f, email: e.target.value }))} placeholder="owner@example.com" autoComplete="email" />
                    </div>
                  </div>

                  <div className="ap-field">
                    <label className="ap-label">Password *</label>
                    <div className="ap-wrap">
                      <span className="ai">{Ic.lock}</span>
                      <input className="ap-input" type={showPw ? "text" : "password"} value={reg.password}
                        onChange={e => setReg(f => ({ ...f, password: e.target.value }))}
                        placeholder="••••••••" autoComplete="new-password" style={{ paddingRight: 40 }} />
                      <button className="eye" onClick={() => setShowPw(s => !s)}>{showPw ? Ic.eyeOff : Ic.eye}</button>
                    </div>
                    {reg.password.length > 0 && (
                      <div>
                        <div className="pw-bar">
                          <div className="pw-fill" style={{ width: `${(["","Weak","Fair","Good","Strong"].indexOf(strength) / 4) * 100}%`, background: pwColor(strength) }} />
                        </div>
                        <p style={{ fontSize: 11, color: pwColor(strength), margin: "3px 0 0", fontWeight: 600 }}>{strength}</p>
                      </div>
                    )}
                  </div>

                  <div className="ap-field">
                    <label className="ap-label">Confirm Password *</label>
                    <div className="ap-wrap">
                      <span className="ai">{Ic.lock}</span>
                      <input className={`ap-input${reg.confirmPassword && reg.confirmPassword !== reg.password ? " err" : ""}`}
                        type={showPw2 ? "text" : "password"} value={reg.confirmPassword}
                        onChange={e => setReg(f => ({ ...f, confirmPassword: e.target.value }))}
                        placeholder="••••••••" autoComplete="new-password" style={{ paddingRight: 40 }} />
                      <button className="eye" onClick={() => setShowPw2(s => !s)}>{showPw2 ? Ic.eyeOff : Ic.eye}</button>
                    </div>
                    {reg.confirmPassword && reg.confirmPassword !== reg.password && (
                      <p style={{ fontSize: 11, color: "#ef4444", margin: "3px 0 0" }}>Passwords don't match</p>
                    )}
                  </div>
                </>
              )}

              {error   && <div className="ap-err"><span>⚠️</span><span style={{ lineHeight: 1.5 }}>{error}</span></div>}
              {success && <div className="ap-ok"><span>✅</span><span>{success}</span></div>}

              <button
                className={`ap-submit${tab === "register" && !isOnline ? " offline-mode" : ""}`}
                disabled={loading}
                onClick={tab === "login" ? () => void handleLogin() : () => void handleRegister()}
              >
                {loading ? (
                  <><div className="ap-spin" /> {tab === "login" ? "Signing in…" : "Creating account…"}</>
                ) : tab === "login" ? (
                  !isOnline ? "Sign in offline (this device only) →" : "Sign In →"
                ) : (
                  !isOnline ? "📵 Create shop (offline) →" : "Create Owner Account →"
                )}
              </button>

              {/* Offline sub-account login */}
              {tab === "login" && !isOnline && (
                <button
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#94a3b8", fontFamily: FONT, textDecoration: "underline", padding: 0, textAlign: "center" }}
                  onClick={() => void handleOfflineSubLogin()}
                >
                  Manager/staff: sign in offline with cached credentials
                </button>
              )}

              <p style={{ fontSize: 11, color: "#bbb", textAlign: "center", margin: 0, lineHeight: 1.6 }}>
                {tab === "login"
                  ? "Manager & staff accounts are created by the shop owner inside the app."
                  : !isOnline
                    ? "Full functionality on this device. Syncs to all devices when online."
                    : "Creates the master owner account. Add managers and staff from Settings."}
              </p>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button onClick={() => navigate("/")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#aaa", fontFamily: FONT, textDecoration: "underline" }}>
              Continue without account
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
