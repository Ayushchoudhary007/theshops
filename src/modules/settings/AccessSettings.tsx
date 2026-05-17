// ─────────────────────────────────────────────────────────────
// src/modules/settings/AccessSettings.tsx
//
// "Access & Permissions" section for the Settings page.
//
// Owner sees:  Managers tab + Staff tab — full CRUD
// Manager sees: Staff tab only (if they have staff:create perm)
// Staff:       not shown at all (handled by Settings.tsx)
//
// Everything is local-first:
//   writes go to SubAccountStore immediately, then try server.
//   sync status badge shows local / pending / synced / failed.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { GLASS, RADIUS, COLOR } from "../../design-tokens";
import { useAuth } from "../auth/useAuth";
import { SubAccountService } from "../auth/sub_account.service";
//import { SubAccountStore }    from "../auth/auth.storage";
import {
  PERMISSION_GROUPS,
  grantablePermissions,
  MANAGER_DEFAULT_PERMISSIONS,
  STAFF_DEFAULT_PERMISSIONS,
} from "../auth/auth.permissions";
import type {
  ManagerRecord,
  StaffRecord,
  Permission,
  CreateManagerForm,
  CreateStaffForm,
} from "../auth/auth.types";

// ── CSS ───────────────────────────────────────────────────────

const CSS = `
  /* Tabs */
  .as-tabs { display:flex; gap:4px; background:rgba(255,255,255,0.38); border:1px solid rgba(255,255,255,0.65); border-radius:999px; padding:4px; }
  .as-tab  { flex:1; border:none; cursor:pointer; outline:none; padding:7px 14px; border-radius:999px; font-size:13px; font-weight:600; transition:all .2s; background:transparent; color:#999; }
  .as-tab.on { background:#fff; color:#c0392b; box-shadow:0 2px 8px rgba(0,0,0,.08); }

  /* Member cards */
  .as-card {
    background:rgba(255,255,255,0.45); border:1.5px solid rgba(255,255,255,0.70);
    border-radius:16px; overflow:hidden;
    transition:box-shadow .2s, border-color .2s;
  }
  .as-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.08); border-color:rgba(255,255,255,0.90); }
  .as-card.inactive { opacity:0.55; }

  /* Sync badge */
  .as-sync { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:700; }
  .as-sync.synced  { background:rgba(21,128,61,.12);  color:#15803d; }
  .as-sync.pending { background:rgba(180,83,9,.12);   color:#b45309; }
  .as-sync.syncing { background:rgba(37,99,235,.12);  color:#1d4ed8; }
  .as-sync.failed  { background:rgba(185,28,28,.12);  color:#b91c1c; }
  .as-sync.local   { background:rgba(107,114,128,.12);color:#6b7280; }
  @keyframes as-spin { to{transform:rotate(360deg)} }
  .as-sync-dot { width:5px;height:5px;border-radius:50%; }
  .as-sync-spinner { width:8px;height:8px;border:1.5px solid currentColor;border-top-color:transparent;border-radius:50%;animation:as-spin .7s linear infinite; }

  /* Permission checkbox rows */
  .as-perm-row {
    display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:10px;
    cursor:pointer; transition:background .13s;
  }
  .as-perm-row:hover { background:rgba(255,255,255,0.55); }
  .as-perm-row.disabled { opacity:.38; cursor:not-allowed; }
  .as-pchk {
    width:18px;height:18px;border-radius:5px;border:1.5px solid rgba(0,0,0,.15);
    cursor:pointer;appearance:none;-webkit-appearance:none;background:rgba(255,255,255,.65);
    transition:all .13s;flex-shrink:0;position:relative;
  }
  .as-pchk:checked { background:#c0392b;border-color:#c0392b; }
  .as-pchk:checked::after { content:"✓";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-size:10px;font-weight:800; }
  .as-pchk:disabled { opacity:.4;cursor:not-allowed; }

  /* Inline form */
  .as-form { border-top:1px solid rgba(0,0,0,.06); padding:16px 16px 14px; }
  .as-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  @media(max-width:500px){ .as-form-grid{ grid-template-columns:1fr; } }

  /* Inline section collapse */
  .as-collapse-btn {
    display:flex;align-items:center;justify-content:space-between;width:100%;
    background:none;border:none;cursor:pointer;padding:10px 16px;
    font-size:13px;font-weight:600;color:#555;
    transition:color .13s;
  }
  .as-collapse-btn:hover { color:#1a1a1a; }
  .as-chevron { transition:transform .22s; font-style:normal; display:inline-block; }
  .as-chevron.open { transform:rotate(180deg); }

  /* Action buttons row */
  .as-actions { display:flex; gap:6px; flex-wrap:wrap; }

  /* Small input */
  .as-input-sm {
    width:100%;background:rgba(255,255,255,.65);border:1.5px solid rgba(255,255,255,.78);
    border-radius:10px;padding:8px 12px;font-size:13px;color:#1a1a1a;
    outline:none;transition:border-color .15s;font-family:inherit;
  }
  .as-input-sm:focus { border-color:rgba(192,57,43,.40); box-shadow:0 0 0 3px rgba(192,57,43,.08); }
  .as-input-sm::placeholder { color:#c0c0c0; }

  /* Small button */
  .as-btn { padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700;border:none;cursor:pointer;transition:all .15s;font-family:inherit;white-space:nowrap; }
  .as-btn:active { transform:scale(.96); }
  .as-btn.primary  { background:#c0392b;color:#fff;box-shadow:0 2px 8px rgba(192,57,43,.28); }
  .as-btn.primary:hover { background:#a93226; }
  .as-btn.ghost    { background:rgba(255,255,255,.55);color:#555;border:1.5px solid rgba(0,0,0,.08); }
  .as-btn.ghost:hover { background:rgba(255,255,255,.90); }
  .as-btn.danger   { background:rgba(239,68,68,.12);color:#b91c1c;border:1.5px solid rgba(239,68,68,.20); }
  .as-btn.danger:hover { background:rgba(239,68,68,.22); }
  .as-btn.success  { background:rgba(21,128,61,.12);color:#15803d;border:1.5px solid rgba(21,128,61,.20); }
  .as-btn.success:hover { background:rgba(21,128,61,.22); }
  .as-btn:disabled { opacity:.45;cursor:not-allowed;transform:none; }

  /* Toast */
  .as-toast {
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:#1a1a1a;color:#fff;padding:10px 20px;
    border-radius:999px;font-size:13px;z-index:9999;
    box-shadow:0 4px 20px rgba(0,0,0,.25);pointer-events:none;
    animation:as-toast-in .22s ease;
  }
  @keyframes as-toast-in { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

  /* Empty state */
  .as-empty { padding:32px 0; text-align:center; }

  /* Perm group header */
  .as-pg-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;margin-top:12px; }

  /* Role pill */
  .as-role { display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700; }
  .as-role.owner   { background:rgba(180,83,9,.12);color:#92400e; }
  .as-role.manager { background:rgba(37,99,235,.12);color:#1e40af; }
  .as-role.staff   { background:rgba(21,128,61,.12);color:#166534; }
`;

// ── Helpers ───────────────────────────────────────────────────

function SyncBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    synced: "Synced", pending: "Pending", syncing: "Syncing", failed: "Failed", local: "Local",
  };
  return (
    <span className={`as-sync ${status}`}>
      {status === "syncing"
        ? <span className="as-sync-spinner" />
        : <span className="as-sync-dot" style={{
            background: { synced: "#22c55e", pending: "#f59e0b", failed: "#ef4444", local: "#9ca3af" }[status] ?? "#9ca3af",
          }} />
      }
      {labels[status] ?? status}
    </span>
  );
}

function Avatar({ name, role }: { name: string; role: string }) {
  const emoji = role === "manager" ? "🧑‍💼" : "🧑‍🔧";
  const bg    = role === "manager" ? "rgba(37,99,235,.10)" : "rgba(21,128,61,.10)";
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 12, background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 18, flexShrink: 0,
    }}>
      {initials ? <span style={{ fontSize: 13, fontWeight: 800, color: role === "manager" ? "#1e40af" : "#166534" }}>{initials}</span> : emoji}
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const show = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);
  return { toast, show };
}

// ── Create form (inline, shared for manager/staff) ────────────

interface CreateFormProps {
  mode:      "manager" | "staff";
  shopIds:   string[];
  onCancel:  () => void;
  onCreated: () => void;
  showToast: (msg: string) => void;
  callerUser: ReturnType<typeof useAuth>["user"];
}

function CreateForm({ mode, shopIds, onCancel, onCreated, showToast, callerUser }: CreateFormProps) {
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [shopId,   setShopId]   = useState(shopIds[0] ?? "");
  const [selShops, setSelShops] = useState<string[]>(shopIds.slice(0, 1));
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleCreate = async () => {
    setError("");
    if (!name.trim() || !email.trim() || !password.trim()) { setError("All fields are required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (!callerUser) return;

    setLoading(true);
    try {
      if (mode === "manager") {
        const form: CreateManagerForm = { name: name.trim(), email: email.trim(), password, shopIds: selShops };
        await SubAccountService.createManager(callerUser, form);
        showToast("Manager account created");
      } else {
        const form: CreateStaffForm = { name: name.trim(), email: email.trim(), password, shopId };
        await SubAccountService.createStaff(callerUser, form);
        showToast("Staff account created");
      }
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="as-form">
      <p style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>
        New {mode} account
      </p>

      <div className="as-form-grid" style={{ marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 11, color: "#aaa", fontWeight: 600, display: "block", marginBottom: 4 }}>Full Name *</label>
          <input className="as-input-sm" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Sharma" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "#aaa", fontWeight: 600, display: "block", marginBottom: 4 }}>Email *</label>
          <input className="as-input-sm" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="priya@shop.com" />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: "#aaa", fontWeight: 600, display: "block", marginBottom: 4 }}>Password *</label>
        <input className="as-input-sm" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" />
      </div>

      {mode === "manager" && shopIds.length > 1 && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: "#aaa", fontWeight: 600, display: "block", marginBottom: 6 }}>Assign to shops</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {shopIds.map(id => (
              <label key={id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  className="as-pchk"
                  checked={selShops.includes(id)}
                  onChange={e => setSelShops(s => e.target.checked ? [...s, id] : s.filter(x => x !== id))}
                />
                {id}
              </label>
            ))}
          </div>
        </div>
      )}

      {mode === "staff" && shopIds.length > 1 && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: "#aaa", fontWeight: 600, display: "block", marginBottom: 4 }}>Shop</label>
          <select className="as-input-sm" value={shopId} onChange={e => setShopId(e.target.value)}>
            {shopIds.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(239,68,68,.10)", border: "1px solid rgba(239,68,68,.22)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#b91c1c", marginBottom: 10 }}>
          {error}
        </div>
      )}

      <div className="as-actions">
        <button className="as-btn primary" disabled={loading} onClick={handleCreate}>
          {loading ? "Creating…" : `Create ${mode}`}
        </button>
        <button className="as-btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Permission editor (expandable inline) ─────────────────────

interface PermEditorProps {
  memberId:    string;
  memberRole:  "manager" | "staff";
  currentPerms: Permission[];
  callerUser:  ReturnType<typeof useAuth>["user"];
  onSaved:     (newPerms: Permission[]) => void;
  showToast:   (msg: string) => void;
}

function PermEditor({ memberId, memberRole, currentPerms, callerUser, onSaved, showToast }: PermEditorProps) {
  const [draft,   setDraft]   = useState<Set<Permission>>(new Set(currentPerms));
  const [loading, setLoading] = useState(false);
  const [dirty,   setDirty]   = useState(false);

  const grantable = callerUser ? new Set(grantablePermissions(callerUser)) : new Set<Permission>();

  // Only show perm groups relevant to this role
  // Managers: hide manager-management and shop groups (not grantable)
  // Staff: show only grantable ones
  const visibleGroups = PERMISSION_GROUPS.filter(g =>
    g.permissions.some(p => grantable.has(p.key))
  );

  const toggle = (key: Permission, allowed: boolean) => {
    if (!allowed) return;
    setDirty(true);
    setDraft(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleGroup = (keys: Permission[], allowed: boolean[]) => {
    const toggleableKeys = keys.filter((_, i) => allowed[i]);
    if (!toggleableKeys.length) return;
    const allOn = toggleableKeys.every(k => draft.has(k));
    setDirty(true);
    setDraft(prev => {
      const next = new Set(prev);
      toggleableKeys.forEach(k => allOn ? next.delete(k) : next.add(k));
      return next;
    });
  };

  const handleSave = async () => {
    if (!callerUser) return;
    setLoading(true);
    try {
      await SubAccountService.updatePermissions(callerUser, memberRole, {
        userId: memberId,
        permissions: Array.from(draft),
      });
      onSaved(Array.from(draft));
      setDirty(false);
      showToast("Permissions updated");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to update permissions");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const defaults = memberRole === "manager" ? MANAGER_DEFAULT_PERMISSIONS : STAFF_DEFAULT_PERMISSIONS;
    setDraft(new Set(defaults));
    setDirty(true);
  };

  return (
    <div style={{ padding: "0 16px 16px" }}>
      {visibleGroups.map(group => {
        const keys     = group.permissions.map(p => p.key);
        const allowed  = group.permissions.map(p => grantable.has(p.key));
        const allOn    = keys.every(k => draft.has(k));
        const anyOn    = keys.some(k => draft.has(k));
        const anyAllowed = allowed.some(Boolean);

        return (
          <div key={group.label}>
            <div className="as-pg-header">
              <span style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: ".06em" }}>
                {group.icon} {group.label}
              </span>
              {anyAllowed && (
                <button
                  className="as-btn ghost"
                  style={{ fontSize: 10, padding: "2px 8px" }}
                  onClick={() => toggleGroup(keys, allowed)}
                >
                  {allOn ? "Remove all" : anyOn ? "Complete" : "Add all"}
                </button>
              )}
            </div>

            <div style={{ background: "rgba(255,255,255,0.30)", borderRadius: 10, overflow: "hidden", marginBottom: 4 }}>
              {group.permissions.map((perm, i) => {
                const isGrantable = allowed[i];
                const isOn        = draft.has(perm.key);
                return (
                  <div
                    key={perm.key}
                    className={`as-perm-row${!isGrantable ? " disabled" : ""}`}
                    onClick={() => toggle(perm.key, isGrantable)}
                  >
                    <input
                      type="checkbox"
                      className="as-pchk"
                      checked={isOn}
                      disabled={!isGrantable}
                      onChange={() => toggle(perm.key, isGrantable)}
                      onClick={e => e.stopPropagation()}
                    />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: isGrantable ? "#1a1a1a" : "#ccc" }}>
                        {perm.label}
                      </span>
                      <span style={{ fontSize: 11, color: "#aaa", marginLeft: 6 }}>
                        {perm.description}
                      </span>
                    </div>
                    {!isGrantable && (
                      <span style={{ fontSize: 9, color: "#ccc", fontWeight: 700, textTransform: "uppercase" }}>Owner only</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {dirty && (
        <div className="as-actions" style={{ marginTop: 12 }}>
          <button className="as-btn primary" disabled={loading} onClick={handleSave}>
            {loading ? "Saving…" : "Save permissions"}
          </button>
          <button className="as-btn ghost" onClick={handleReset}>Reset to defaults</button>
          <button className="as-btn ghost" onClick={() => { setDraft(new Set(currentPerms)); setDirty(false); }}>
            Discard
          </button>
        </div>
      )}
      {!dirty && (
        <p style={{ fontSize: 11, color: "#bbb", marginTop: 8 }}>Click permissions to toggle • Greyed = requires owner</p>
      )}
    </div>
  );
}

// ── Reset password inline ─────────────────────────────────────

function ResetPasswordForm({
  memberId, memberRole, onDone, showToast, callerUser,
}: {
  memberId: string; memberRole: "manager" | "staff";
  onDone: () => void; showToast: (msg: string) => void;
  callerUser: ReturnType<typeof useAuth>["user"];
}) {
  const [pw,      setPw]      = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  const handleReset = async () => {
    setErr("");
    if (pw.length < 6)    { setErr("Min 6 characters"); return; }
    if (pw !== confirm)   { setErr("Passwords don't match"); return; }
    if (!callerUser) return;
    setLoading(true);
    try {
      await SubAccountService.resetPassword(callerUser, memberRole, memberId, pw);
      showToast("Password reset successfully");
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="as-form-grid">
        <input className="as-input-sm" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="New password" />
        <input className="as-input-sm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm password" />
      </div>
      {err && <p style={{ fontSize: 11, color: "#b91c1c", margin: 0 }}>{err}</p>}
      <div className="as-actions">
        <button className="as-btn primary" disabled={loading} onClick={handleReset}>{loading ? "Resetting…" : "Set password"}</button>
        <button className="as-btn ghost" onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}

// ── Member card ───────────────────────────────────────────────

interface MemberCardProps {
  record:     ManagerRecord | StaffRecord;
  role:       "manager" | "staff";
  callerUser: ReturnType<typeof useAuth>["user"];
  showToast:  (msg: string) => void;
  onRefresh:  () => void;
}

function MemberCard({ record, role, callerUser, showToast, onRefresh }: MemberCardProps) {
  const [permOpen,    setPermOpen]    = useState(false);
  const [pwOpen,      setPwOpen]      = useState(false);
  const [localPerms,  setLocalPerms]  = useState<Permission[]>(record.permissions);
  const [deactivating, setDeactivating] = useState(false);

  const canEdit       = callerUser?.role === "owner" || callerUser?.permissions.includes("staff:edit");
  const canDeactivate = callerUser?.role === "owner" || callerUser?.permissions.includes("staff:deactivate");
  const canPermissions= callerUser?.role === "owner" ||
    (role === "staff" && callerUser?.permissions.includes("staff:permissions"));

  const handleToggleActive = async () => {
    if (!callerUser) return;
    setDeactivating(true);
    try {
      if (record.active) {
        if (role === "manager") await SubAccountService.deactivateManager(callerUser, record.localId);
        else                    await SubAccountService.deactivateStaff(callerUser, record.localId);
        showToast("Account deactivated");
      } else {
        if (role === "manager") await SubAccountService.reactivateManager(callerUser, record.localId);
        else                    await SubAccountService.reactivateStaff(callerUser, record.localId);
        showToast("Account reactivated");
      }
      onRefresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed");
    } finally {
      setDeactivating(false);
    }
  };

  const permSummary = (() => {
    const total = localPerms.length;
    if (total === 0) return "No permissions";
    // Count distinct domains
    const domains = new Set(localPerms.map(p => p.split(":")[0]));
    return `${total} permission${total !== 1 ? "s" : ""} across ${domains.size} area${domains.size !== 1 ? "s" : ""}`;
  })();

  return (
    <div className={`as-card${!record.active ? " inactive" : ""}`}>
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px 12px" }}>
        <Avatar name={record.name} role={role} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {record.name}
            </span>
            <span className={`as-role ${role}`}>
              {role === "manager" ? "🧑‍💼" : "🧑‍🔧"} {role}
            </span>
            {!record.active && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", textTransform: "uppercase" }}>Inactive</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#aaa", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {record.email}
          </div>
          <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>
            {permSummary}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <SyncBadge status={record.syncStatus} />
          {"shopIds" in record && record.shopIds.length > 1 && (
            <span style={{ fontSize: 10, color: "#94a3b8" }}>{record.shopIds.length} shops</span>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div style={{ padding: "0 16px 12px", display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid rgba(0,0,0,.04)" , paddingTop: 10 }}>
        {canPermissions && (
          <button
            className="as-btn ghost"
            style={{ fontSize: 11 }}
            onClick={() => { setPermOpen(o => !o); setPwOpen(false); }}
          >
            {permOpen ? "▲ Permissions" : "▼ Permissions"}
          </button>
        )}
        {canEdit && (
          <button
            className="as-btn ghost"
            style={{ fontSize: 11 }}
            onClick={() => { setPwOpen(o => !o); setPermOpen(false); }}
          >
            {pwOpen ? "✕ Password" : "🔑 Reset password"}
          </button>
        )}
        {canDeactivate && (
          <button
            className={`as-btn ${record.active ? "danger" : "success"}`}
            style={{ fontSize: 11, marginLeft: "auto" }}
            disabled={deactivating}
            onClick={handleToggleActive}
          >
            {deactivating ? "…" : record.active ? "Deactivate" : "Reactivate"}
          </button>
        )}
      </div>

      {/* Permissions panel */}
      {permOpen && (
        <div style={{ borderTop: "1px solid rgba(0,0,0,.06)" }}>
          <PermEditor
            memberId={record.localId}
            memberRole={role}
            currentPerms={localPerms}
            callerUser={callerUser}
            onSaved={perms => { setLocalPerms(perms); }}
            showToast={showToast}
          />
        </div>
      )}

      {/* Reset password panel */}
      {pwOpen && (
        <div style={{ borderTop: "1px solid rgba(0,0,0,.06)", padding: "14px 16px 12px" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
            Reset password
          </p>
          <ResetPasswordForm
            memberId={record.localId}
            memberRole={role}
            callerUser={callerUser}
            showToast={showToast}
            onDone={() => setPwOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export default function AccessSettings() {
  const auth = useAuth();
  const { toast, show: showToast } = useToast();

  const isOwner   = auth.isOwner;
  const isManager = auth.isManager;
  const canManageStaff = isOwner || (isManager && auth.can("staff:create"));

  // Tab: owners see both, managers see only staff
  type Tab = "managers" | "staff";
  const [tab, setTab] = useState<Tab>(isOwner ? "managers" : "staff");

  const [managers,   setManagers]   = useState<ManagerRecord[]>([]);
  const [staff,      setStaff]      = useState<StaffRecord[]>([]);
  const [creating,   setCreating]   = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // Load from local store
  useEffect(() => {
    if (isOwner) {
      setManagers(SubAccountService.listManagers());
    }
    if (canManageStaff) {
      const shopId = auth.shopIds[0] ?? "";
      setStaff(SubAccountService.listStaff(shopId));
    }
  }, [refreshKey, isOwner, canManageStaff, auth.shopIds]);

  // Guard: staff members don't see this section at all
  if (!isOwner && !canManageStaff) return null;

  const activeManagers  = managers.filter(m => m.active);
  const inactiveManagers = managers.filter(m => !m.active);
  const activeStaff     = staff.filter(s => s.active);
  const inactiveStaff   = staff.filter(s => !s.active);

  return (
    <>
      <style>{CSS}</style>
      {toast && <div className="as-toast">{toast}</div>}

      <section style={{ ...GLASS, borderRadius: RADIUS.card, overflow: "hidden", marginBottom: 16 }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(0,0,0,.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: COLOR.text, margin: 0 }}>
                Access &amp; Permissions
              </h2>
              <p style={{ fontSize: 12, color: COLOR.textSoft, margin: "3px 0 0" }}>
                {isOwner
                  ? `${managers.length} manager${managers.length !== 1 ? "s" : ""} · ${staff.length} staff member${staff.length !== 1 ? "s" : ""}`
                  : `${staff.length} staff member${staff.length !== 1 ? "s" : ""} in your shop`}
              </p>
            </div>

            {/* Add button */}
            {!creating && (
              <button className="as-btn primary" onClick={() => setCreating(true)}>
                + Add {tab === "managers" ? "manager" : "staff"}
              </button>
            )}
          </div>

          {/* Tabs (owner only — managers see only staff) */}
          {isOwner && (
            <div className="as-tabs" style={{ marginTop: 14 }}>
              <button className={`as-tab${tab === "managers" ? " on" : ""}`} onClick={() => { setTab("managers"); setCreating(false); }}>
                🧑‍💼 Managers {managers.length > 0 && `(${managers.length})`}
              </button>
              <button className={`as-tab${tab === "staff" ? " on" : ""}`} onClick={() => { setTab("staff"); setCreating(false); }}>
                🧑‍🔧 Staff {staff.length > 0 && `(${staff.length})`}
              </button>
            </div>
          )}
        </div>

        {/* Create form */}
        {creating && (
          <CreateForm
            mode={tab === "managers" ? "manager" : "staff"}
            shopIds={auth.shopIds.length ? auth.shopIds : ["default"]}
            callerUser={auth.user}
            onCancel={() => setCreating(false)}
            onCreated={() => { setCreating(false); refresh(); }}
            showToast={showToast}
          />
        )}

        {/* Member list */}
        <div style={{ padding: "16px 24px 20px", display: "flex", flexDirection: "column", gap: 10 }}>

          {/* ── Managers tab ── */}
          {tab === "managers" && isOwner && (
            <>
              {managers.length === 0 && !creating && (
                <div className="as-empty">
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🧑‍💼</div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#888", margin: 0 }}>No managers yet</p>
                  <p style={{ fontSize: 12, color: "#bbb", margin: "4px 0 0" }}>
                    Managers can handle most shop operations. Add one to get started.
                  </p>
                </div>
              )}

              {activeManagers.map(m => (
                <MemberCard key={m.localId} record={m} role="manager"
                  callerUser={auth.user} showToast={showToast} onRefresh={refresh} />
              ))}

              {/* Inactive managers collapsible */}
              {inactiveManagers.length > 0 && (
                <InactiveSection label={`${inactiveManagers.length} inactive manager${inactiveManagers.length !== 1 ? "s" : ""}`}>
                  {inactiveManagers.map(m => (
                    <MemberCard key={m.localId} record={m} role="manager"
                      callerUser={auth.user} showToast={showToast} onRefresh={refresh} />
                  ))}
                </InactiveSection>
              )}
            </>
          )}

          {/* ── Staff tab ── */}
          {tab === "staff" && (
            <>
              {staff.length === 0 && !creating && (
                <div className="as-empty">
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🧑‍🔧</div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#888", margin: 0 }}>No staff yet</p>
                  <p style={{ fontSize: 12, color: "#bbb", margin: "4px 0 0" }}>
                    Staff members handle daily POS and operations with restricted access.
                  </p>
                </div>
              )}

              {activeStaff.map(s => (
                <MemberCard key={s.localId} record={s} role="staff"
                  callerUser={auth.user} showToast={showToast} onRefresh={refresh} />
              ))}

              {inactiveStaff.length > 0 && (
                <InactiveSection label={`${inactiveStaff.length} inactive staff member${inactiveStaff.length !== 1 ? "s" : ""}`}>
                  {inactiveStaff.map(s => (
                    <MemberCard key={s.localId} record={s} role="staff"
                      callerUser={auth.user} showToast={showToast} onRefresh={refresh} />
                  ))}
                </InactiveSection>
              )}
            </>
          )}
        </div>

        {/* Legend */}
        <div style={{ padding: "10px 24px 16px", borderTop: "1px solid rgba(0,0,0,.04)", display: "flex", gap: 12, flexWrap: "wrap" }}>
          {(["synced", "pending", "local", "failed"] as const).map(s => (
            <SyncBadge key={s} status={s} />
          ))}
          <span style={{ fontSize: 10, color: "#ccc", alignSelf: "center" }}>
            · Pending/local changes sync automatically when online
          </span>
        </div>
      </section>
    </>
  );
}

// ── Inactive section collapsible ──────────────────────────────

function InactiveSection({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button className="as-collapse-btn" onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: 12, color: "#aaa" }}>{label}</span>
        <i className={`as-chevron${open ? " open" : ""}`}>▼</i>
      </button>
      {open && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>}
    </div>
  );
}
