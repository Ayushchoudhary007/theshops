// ─────────────────────────────────────────────────────────────
// src/design-tokens.ts  (UPDATED — v2.4, adds PAYMENT_MODES)
//
// All design values + shared constants.
// Every module imports from here — no magic strings anywhere.
// ─────────────────────────────────────────────────────────────

export const BRAND   = "#c0392b";
export const BRAND_A = "rgba(192,57,43,";

export const GLASS = {
  background:      "rgba(255,255,255,0.28)",
  backgroundDeep:  "rgba(255,255,255,0.45)",
  border:          "rgba(255,255,255,0.60)",
  borderDeep:      "rgba(255,255,255,0.65)",
  backdropFilter:  "blur(18px) saturate(200%)",
  backdropDeep:    "blur(24px) saturate(210%)",
  shadow:          "0 4px 30px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.55)",
  shadowDeep:      "0 16px 48px rgba(0,0,0,0.13), inset 0 1px 0 rgba(255,255,255,0.6)",
  shadowCard:      "0 8px 32px rgba(0,0,0,0.09), inset 0 1px 0 rgba(255,255,255,0.5)",
} as const;

export const RADIUS = {
  pill:  "999px",
  card:  "22px",
  item:  "14px",
  input: "10px",
  badge: "999px",
  icon:  "12px",
  btn:   "50px",
} as const;

export const FONT = {
  family: "'Inter', sans-serif",
  serif:  "'Noto Serif JP', Georgia, serif",
} as const;

export const COLOR = {
  text:       "#222",
  textMid:    "#444",
  textSoft:   "#888",
  textFaint:  "#bbb",
  divider:    "rgba(0,0,0,0.06)",
  dividerMid: "rgba(0,0,0,0.12)",
  hover:      "rgba(255,255,255,0.55)",
  activeTab:  `rgba(192,57,43,0.10)`,
  surface:    "rgba(255,255,255,0.28)",
} as const;

export const STATUS = {
  "in-stock":    { bg: "rgba(34,197,94,0.12)",  text: "#15803d", label: "In Stock"     },
  "low-stock":   { bg: "rgba(234,179,8,0.14)",  text: "#a16207", label: "Low Stock"    },
  "out-of-stock":{ bg: "rgba(239,68,68,0.12)",  text: "#b91c1c", label: "Out of Stock" },
} as const;

/** Payment mode options — used in Billing + BillPreview */
export const PAYMENT_MODES = [
  { value: "cash" as const, label: "Cash", icon: "💵" },
  { value: "upi"  as const, label: "UPI",  icon: "📱" },
  { value: "card" as const, label: "Card", icon: "💳" },
] as const;

// ── Background gradient (shared across all pages) ─────────────
export const PAGE_BG: React.CSSProperties = {
  background: "linear-gradient(135deg,#fce4e4 0%,#fde8d8 20%,#fef9c3 40%,#dcfce7 60%,#dbeafe 80%,#ede9fe 100%)",
  backgroundAttachment: "fixed",
  minHeight: "100vh",
};

// ── Global styles string — injected once per page ─────────────
export const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', sans-serif;
    background: linear-gradient(135deg,
      #fce4e4 0%, #fde8d8 20%, #fef9c3 40%,
      #dcfce7 60%, #dbeafe 80%, #ede9fe 100%);
    min-height: 100vh;
  }

  .iv-glass {
    background: rgba(255,255,255,0.38);
    backdrop-filter: blur(20px) saturate(200%);
    -webkit-backdrop-filter: blur(20px) saturate(200%);
    border: 1px solid rgba(255,255,255,0.62);
    box-shadow: 0 8px 32px rgba(0,0,0,0.09), inset 0 1px 0 rgba(255,255,255,0.5);
    isolation: isolate;
  }

  .iv-input {
    width: 100%;
    background: rgba(255,255,255,0.55);
    border: 1px solid rgba(255,255,255,0.70);
    border-radius: 10px;
    padding: 9px 13px;
    font-size: 14px;
    font-family: 'Inter', sans-serif;
    color: #222;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    backdrop-filter: blur(8px);
  }
  .iv-input:focus {
    border-color: rgba(192,57,43,0.45);
    box-shadow: 0 0 0 3px rgba(192,57,43,0.10);
  }
  .iv-input::placeholder { color: #aaa; }

  /* Primary button */
  .iv-btn-primary {
    background: ${BRAND};
    color: #fff;
    border: none;
    border-radius: 50px;
    padding: 9px 20px;
    font-size: 14px;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    transition: background 0.15s, transform 0.12s, box-shadow 0.15s;
    box-shadow: 0 3px 12px rgba(192,57,43,0.25);
  }
  .iv-btn-primary:hover  { background: #a93226; box-shadow: 0 4px 16px rgba(192,57,43,0.35); transform: translateY(-1px); }
  .iv-btn-primary:active { transform: scale(0.97); }
  .iv-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .iv-btn-ghost {
    background: rgba(255,255,255,0.45);
    color: #444;
    border: 1px solid rgba(255,255,255,0.65);
    border-radius: 50px;
    padding: 9px 20px;
    font-size: 14px;
    font-weight: 500;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    transition: background 0.15s, transform 0.12s;
    backdrop-filter: blur(8px);
  }
  .iv-btn-ghost:hover  { background: rgba(255,255,255,0.65); transform: translateY(-1px); }
  .iv-btn-ghost:active { transform: scale(0.97); }

  .iv-btn-danger {
    background: rgba(239,68,68,0.12);
    color: #b91c1c;
    border: 1px solid rgba(239,68,68,0.25);
    border-radius: 50px;
    padding: 9px 20px;
    font-size: 14px;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    transition: background 0.15s, transform 0.12s;
  }
  .iv-btn-danger:hover  { background: rgba(239,68,68,0.20); transform: translateY(-1px); }
  .iv-btn-danger:active { transform: scale(0.97); }
`;
