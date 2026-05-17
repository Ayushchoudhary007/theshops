// ─────────────────────────────────────────────────────────────
// src/app/OnlineGate.tsx
//
// Wraps any feature that requires (or is enhanced by) a
// network connection.
//
// Usage:
//
//   // Hard gate — disabled offline
//   <OnlineGate feature="BILLING_PAYMENT">
//     <PaymentForm />
//   </OnlineGate>
//
//   // Soft gate — works offline but shows a note
//   <OnlineGate feature="BARCODE_SCAN" soft>
//     <BarcodeScanner />
//   </OnlineGate>
//
//   // Custom fallback
//   <OnlineGate feature="REPORTS_ADVANCED" fallback={<LocalReports />}>
//     <AdvancedReports />
//   </OnlineGate>
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { useFeature } from "../hooks/useFeature";
import type { FeatureKey } from "../services/features";
import { FEATURES } from "../services/features";

interface Props {
  feature: FeatureKey;
  children: ReactNode;
  /** If true, render children even offline but show the note banner */
  soft?: boolean;
  /** Custom element to render when unavailable (overrides default blocked UI) */
  fallback?: ReactNode;
  /** Hide the banner even in soft mode */
  silent?: boolean;
}

export function OnlineGate({
  feature,
  children,
  soft = false,
  fallback,
  silent = false,
}: Props) {
  const { available, note } = useFeature(feature);
  const capability = FEATURES[feature];

  // "always" features render directly — no wrapping needed
  if (capability.availability === "always") {
    return <>{children}</>;
  }

  // Unavailable + hard gate
  if (!available && !soft) {
    if (fallback) return <>{fallback}</>;
    return (
      <div style={s.blocked}>
        <span style={s.blockedIcon}>📵</span>
        <p style={s.blockedLabel}>{capability.label}</p>
        <p style={s.blockedNote}>{note}</p>
      </div>
    );
  }

  // Available (or soft mode) — render children + optional note
  return (
    <>
      {!silent && note && (
        <div
          style={{
            ...s.noteBanner,
            background: available
              ? "rgba(16,185,129,0.08)"
              : "rgba(234,179,8,0.10)",
            borderColor: available
              ? "rgba(16,185,129,0.2)"
              : "rgba(234,179,8,0.25)",
          }}
        >
          <span>{available ? "🌐" : "📵"}</span>
          <span style={s.noteText}>{note}</span>
        </div>
      )}
      {children}
    </>
  );
}

// ── Inline disabled button wrapper ───────────────────────────
// Use this when you just want to disable a single button

interface GatedButtonProps {
  feature: FeatureKey;
  onClick: () => void;
  children: ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function GatedButton({
  feature,
  onClick,
  children,
  style,
  className,
}: GatedButtonProps) {
  const { available, note } = useFeature(feature);

  return (
    <button
      onClick={available ? onClick : undefined}
      disabled={!available}
      title={!available ? (note ?? undefined) : undefined}
      style={{
        ...style,
        opacity: available ? 1 : 0.45,
        cursor: available ? "pointer" : "not-allowed",
      }}
      className={className}
    >
      {children}
    </button>
  );
}

const s: Record<string, React.CSSProperties> = {
  blocked: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 24px",
    gap: 8,
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: 14,
    textAlign: "center",
  },
  blockedIcon: { fontSize: 32 },
  blockedLabel: {
    margin: 0,
    fontWeight: 600,
    color: "#334155",
    fontFamily: "Inter, sans-serif",
    fontSize: 15,
  },
  blockedNote: {
    margin: 0,
    color: "#94a3b8",
    fontFamily: "Inter, sans-serif",
    fontSize: 13,
  },
  noteBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid",
    marginBottom: 12,
    fontSize: 13,
    fontFamily: "Inter, sans-serif",
    color: "#475569",
  },
  noteText: { flex: 1, lineHeight: 1.5 },
};
