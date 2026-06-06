// src/modules/reports/pages/Reports.tsx

import { useState, useEffect, useCallback } from "react";
import { BRAND, GLASS, RADIUS, COLOR, GLOBAL_STYLES } from "../../../design-tokens";
import { BillingService } from "../../billing/billing.service";
import { query } from "../../../database";
import { ApiService } from "../../../services/api.service";
import { useAuth } from "../../auth/useAuth";
import { useNetworkStatus } from "../../../hooks/useNetworkStatus";

interface DayRevenue { date: string; revenue: number; count: number; }
interface TopProduct  { name: string; quantity: number; revenue: number; }
interface PayMode     { payment_mode: string; count: number; total: number; }

const PERIOD_OPTIONS = [
  { label: "7 days",  days: 7  },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

const PAYMODE_COLORS: Record<string, string> = {
  cash: "#185FA5",
  upi:  "#15803d",
  card: "#854F0B",
};

// ── BarChart — TOP-LEVEL component (not nested) ───────────────
function BarChart({ data, height = 120 }: { data: DayRevenue[]; height?: number }) {
  if (!data.length) return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: COLOR.textFaint, fontSize: 13 }}>
      No data for this period
    </div>
  );
  const max     = Math.max(...data.map(d => d.revenue), 1);
  const visible = data.slice(-28);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height, paddingBottom: 20 }}>
      {visible.map((d, i) => {
        const h     = Math.max((d.revenue / max) * (height - 28), 2);
        const label = d.date.slice(5);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div
              title={`${d.date}: ₹${d.revenue.toFixed(0)} (${d.count} bills)`}
              style={{ width: "100%", height: h, background: BRAND, borderRadius: "3px 3px 0 0", opacity: 0.8, cursor: "default", transition: "opacity 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0.8")}
            />
            {visible.length <= 14 && (
              <div style={{ fontSize: 8, color: COLOR.textFaint, transform: "rotate(-30deg)", transformOrigin: "top center", whiteSpace: "nowrap" }}>
                {label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── PaymentBar — TOP-LEVEL component (not nested) ─────────────
function PaymentBar({ payModes }: { payModes: PayMode[] }) {
  const total = payModes.reduce((s, p) => s + Number(p.total), 0) || 1;
  return (
    <div>
      <div style={{ display: "flex", height: 18, borderRadius: 9, overflow: "hidden", marginBottom: 10 }}>
        {payModes.map(pm => (
          <div key={pm.payment_mode} style={{
            flex: Number(pm.total) / total,
            background: PAYMODE_COLORS[pm.payment_mode] ?? "#888",
            minWidth: Number(pm.total) > 0 ? 4 : 0,
          }} />
        ))}
      </div>
      {payModes.map(pm => (
        <div key={pm.payment_mode} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: COLOR.text, marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: PAYMODE_COLORS[pm.payment_mode] ?? "#888" }} />
            <span style={{ textTransform: "capitalize" }}>{pm.payment_mode}</span>
            <span style={{ fontSize: 11, color: COLOR.textFaint }}>({pm.count} bills)</span>
          </div>
          <span style={{ fontWeight: 600 }}>₹{Number(pm.total).toLocaleString("en-IN")}</span>
        </div>
      ))}
      {payModes.length === 0 && (
        <div style={{ fontSize: 13, color: COLOR.textFaint, textAlign: "center", padding: "10px 0" }}>No data</div>
      )}
    </div>
  );
}

// ── Reports page ──────────────────────────────────────────────
export default function Reports() {
  const auth = useAuth();
  const { isOnline } = useNetworkStatus();

  const [period,     setPeriod]     = useState(30);
  const [dailyRev,   setDailyRev]   = useState<DayRevenue[]>([]);
  const [topProds,   setTopProds]   = useState<TopProduct[]>([]);
  const [payModes,   setPayModes]   = useState<PayMode[]>([]);
  const [todayStats, setTodayStats] = useState({ count: 0, revenue: 0, avgBill: 0 });
  const [totalItems, setTotalItems] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [dataSource, setDataSource] = useState<"server" | "local">("local");

  const load = useCallback(async () => {
    setLoading(true);

    const shopId = auth.user?.shops?.[0]?.id ?? auth.user?.shopId;
    const canUseServer = isOnline && auth.user && auth.user.token !== "offline" && shopId;

    if (canUseServer) {
      try {
        const [daily, prods, modes, today] = await Promise.all([
          ApiService.get<DayRevenue[]>(`/api/reports/daily-revenue?shopId=${shopId}&days=${period}`),
          ApiService.get<TopProduct[]>(`/api/reports/top-products?shopId=${shopId}&days=${period}&limit=8`),
          ApiService.get<PayMode[]>(`/api/reports/payment-modes?shopId=${shopId}`),
          ApiService.get<{ count: number; revenue: number; avgBill: number }>(`/api/reports/today?shopId=${shopId}`),
        ]);
        const inv = await query<{ n: number }>("SELECT COUNT(*) AS n FROM inventory");
        setDailyRev(daily);
        setTopProds(prods);
        setPayModes(modes);
        setTodayStats(today);
        setTotalItems(inv[0]?.n ?? 0);
        setDataSource("server");
        setLoading(false);
        return;
      } catch {
        // Fall through to local
      }
    }

    // Local fallback
    const [daily, prods, modes, today, inv] = await Promise.all([
      BillingService.dailyRevenue(period),
      BillingService.topProducts(8, period),
      BillingService.paymentModeBreakdown(),
      BillingService.todayStats(),
      query<{ n: number }>("SELECT COUNT(*) AS n FROM inventory"),
    ]);
    setDailyRev(daily as DayRevenue[]);
    setTopProds(prods as TopProduct[]);
    setPayModes(modes as PayMode[]);
    setTodayStats(today);
    setTotalItems(inv[0]?.n ?? 0);
    setDataSource("local");
    setLoading(false);
  }, [period, isOnline, auth.user]);

  useEffect(() => { void load(); }, [load]);

  const totalRevenue = dailyRev.reduce((s, d) => s + d.revenue, 0);
  const totalBills   = dailyRev.reduce((s, d) => s + d.count,   0);
  const maxRevenue   = Math.max(...dailyRev.map(d => d.revenue), 1);
  const bestDay      = [...dailyRev].sort((a, b) => b.revenue - a.revenue)[0];

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <style>{`.rpt-card { transition: box-shadow 0.15s; }`}</style>
      <div style={{ minHeight: "100vh", padding: "24px 20px", fontFamily: "'Inter', sans-serif", background: "linear-gradient(135deg,#fce4e4 0%,#fde8d8 20%,#fef9c3 40%,#dcfce7 60%,#dbeafe 80%,#ede9fe 100%)", backgroundAttachment: "fixed" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: COLOR.text }}>Reports</h1>
            <div style={{ fontSize: 12, color: COLOR.textFaint }}>
              {dataSource === "server" ? "☁ Server data (all devices)" : "💾 Local data (this device only)"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {PERIOD_OPTIONS.map(opt => (
              <button key={opt.days} onClick={() => setPeriod(opt.days)} style={{
                fontSize: 12, fontWeight: 500, padding: "7px 14px", borderRadius: RADIUS.pill,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
                border: period === opt.days ? `2px solid ${BRAND}` : "1px solid rgba(255,255,255,0.65)",
                background: period === opt.days ? "rgba(192,57,43,0.10)" : "rgba(255,255,255,0.45)",
                color: period === opt.days ? BRAND : COLOR.textMid,
              }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: COLOR.textSoft }}>Loading reports…</div>
        ) : (
          <>
            {/* KPI tiles */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { l: "Today's revenue",    v: `₹${todayStats.revenue.toLocaleString("en-IN")}`, icon: "💰" },
                { l: "Today's bills",      v: todayStats.count,                                  icon: "🧾" },
                { l: "Avg bill",           v: `₹${todayStats.avgBill.toFixed(0)}`,              icon: "📊" },
                { l: `${period}d revenue`, v: `₹${totalRevenue.toLocaleString("en-IN")}`,       icon: "📈" },
                { l: `${period}d bills`,   v: totalBills,                                        icon: "📋" },
                { l: "Inventory items",    v: totalItems,                                        icon: "📦" },
              ].map(k => (
                <div key={k.l} className="rpt-card" style={{ ...GLASS, borderRadius: RADIUS.item, padding: "14px 16px" }}>
                  <div style={{ fontSize: 18, marginBottom: 6 }}>{k.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: COLOR.text }}>{k.v}</div>
                  <div style={{ fontSize: 11, color: COLOR.textSoft, marginTop: 2 }}>{k.l}</div>
                </div>
              ))}
            </div>

            {/* Revenue chart */}
            <div style={{ ...GLASS, borderRadius: RADIUS.card, padding: "20px 24px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: COLOR.text }}>Daily Revenue</h2>
                <span style={{ fontSize: 12, color: COLOR.textSoft }}>Last {period} days</span>
              </div>
              <BarChart data={dailyRev} height={140} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: COLOR.textFaint, marginTop: -4 }}>
                <span>₹0</span>
                <span>₹{(maxRevenue / 2).toFixed(0)}</span>
                <span>₹{maxRevenue.toFixed(0)}</span>
              </div>
            </div>

            {/* Bottom row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {/* Top products */}
              <div style={{ ...GLASS, borderRadius: RADIUS.card, padding: "20px 24px" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: COLOR.text, marginBottom: 14 }}>Top Products</h2>
                {topProds.length === 0 ? (
                  <div style={{ fontSize: 13, color: COLOR.textFaint, textAlign: "center", padding: "10px 0" }}>No data</div>
                ) : topProds.map((p, i) => {
                  const pct = (p.revenue / topProds[0].revenue) * 100;
                  return (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: COLOR.text, marginBottom: 3 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>{i + 1}. {p.name}</span>
                        <span style={{ fontWeight: 600, color: BRAND }}>₹{Number(p.revenue).toLocaleString("en-IN")}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: BRAND, width: `${pct}%`, opacity: 0.75 }} />
                      </div>
                      <div style={{ fontSize: 10, color: COLOR.textFaint, marginTop: 2 }}>{p.quantity} units sold</div>
                    </div>
                  );
                })}
              </div>

              {/* Payment modes */}
              <div style={{ ...GLASS, borderRadius: RADIUS.card, padding: "20px 24px" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: COLOR.text, marginBottom: 14 }}>Payment Modes</h2>
                <PaymentBar payModes={payModes} />
              </div>

              {/* Period summary */}
              <div style={{ ...GLASS, borderRadius: RADIUS.card, padding: "20px 24px" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: COLOR.text, marginBottom: 14 }}>Period Summary</h2>
                {[
                  { l: "Total revenue",     v: `₹${totalRevenue.toLocaleString("en-IN")}` },
                  { l: "Total bills",       v: totalBills },
                  { l: "Avg daily revenue", v: `₹${(totalRevenue / period).toFixed(0)}` },
                  { l: "Avg bill size",     v: `₹${totalBills > 0 ? (totalRevenue / totalBills).toFixed(0) : 0}` },
                  { l: "Best day",          v: bestDay?.date ?? "—" },
                  { l: "Best day revenue",  v: `₹${(bestDay?.revenue ?? 0).toLocaleString("en-IN")}` },
                ].map(r => (
                  <div key={r.l} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid rgba(0,0,0,0.05)", padding: "7px 0" }}>
                    <span style={{ color: COLOR.textSoft }}>{r.l}</span>
                    <span style={{ fontWeight: 600, color: COLOR.text }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
