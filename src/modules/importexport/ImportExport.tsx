// ─────────────────────────────────────────────────────────────
// src/modules/importexport/ImportExport.tsx
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { InventoryService } from "../inventory/pages/inventory.service";
import type { InventoryItem } from "../inventory/pages/inventory.types";

/* ─────────────── Types ─────────────────────────────────── */
type ExportFormat = "json" | "csv" | "bundle";
type ImportStatus =
  | "idle"
  | "parsing"
  | "preview"
  | "importing"
  | "done"
  | "error";
type ConflictMode = "skip" | "overwrite" | "merge";

interface ParsedItem {
  name: string;
  sku: string;
  brand: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  barcode?: string;
  image?: string;
  lastUpdated: string;
  _valid: boolean;
  _errors: string[];
  _conflict: boolean;
}

const CSV_HEADERS = [
  "name",
  "sku",
  "brand",
  "category",
  "price",
  "stock",
  "status",
  "barcode",
  "image",
  "lastUpdated",
];

/* ─────────────── Helpers ───────────────────────────────── */
function toCSV(items: InventoryItem[]) {
  const rows = items.map((i) =>
    CSV_HEADERS.map((h) => {
      const v = String((i as unknown as Record<string, unknown>)[h] ?? "");
      return v.includes(",") || v.includes('"')
        ? `"${v.replace(/"/g, '""')}"`
        : v;
    }).join(","),
  );
  return [CSV_HEADERS.join(","), ...rows].join("\n");
}

function toJSON(items: InventoryItem[]) {
  return JSON.stringify(
    { exported: new Date().toISOString(), count: items.length, items },
    null,
    2,
  );
}

function toBundle(items: InventoryItem[], meta?: object) {
  return JSON.stringify(
    {
      type: "theshop-backup",
      version: "1.0",
      app: "TheShop",
      exported: new Date().toISOString(),
      deviceId: "local",
      ...(meta ?? {}),
      data: { inventory: items },
    },
    null,
    2,
  );
}

function download(content: string, name: string, mime: string) {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([content], { type: mime })),
    download: name,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function parseCSVLine(line: string) {
  const r: string[] = [];
  let cur = "",
    inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === "," && !inQ) {
      r.push(cur);
      cur = "";
    } else cur += c;
  }
  r.push(cur);
  return r;
}

function validateRow(
  row: Record<string, string>,
  skus: Set<string>,
): ParsedItem {
  const errors: string[] = [];
  const name = (row.name ?? "").trim();
  const sku = (row.sku ?? "").trim();
  const price = parseFloat(row.price ?? "");
  const stock = parseInt(row.stock ?? "", 10);
  if (!name) errors.push("Name required");
  if (!sku) errors.push("SKU required");
  if (isNaN(price)) errors.push("Invalid price");
  if (isNaN(stock)) errors.push("Invalid stock");
  const validSt = ["in-stock", "low-stock", "out-of-stock"];
  const status = validSt.includes(row.status)
    ? row.status
    : stock === 0
      ? "out-of-stock"
      : stock < 10
        ? "low-stock"
        : "in-stock";
  return {
    name,
    sku,
    brand: (row.brand ?? "").trim(),
    category: (row.category ?? "").trim(),
    price: isNaN(price) ? 0 : price,
    stock: isNaN(stock) ? 0 : stock,
    status,
    barcode: row.barcode ?? "",
    image: row.image ?? "",
    lastUpdated: row.lastUpdated || new Date().toISOString(),
    _valid: errors.length === 0,
    _errors: errors,
    _conflict: skus.has(sku),
  };
}

/* ─────────────── CSS ───────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  .ie-page {
    min-height:100vh;
    background:linear-gradient(135deg,#fce4e4 0%,#fde8d8 20%,#fef9c3 40%,#dcfce7 60%,#dbeafe 80%,#ede9fe 100%);
    padding:92px 32px 100px; font-family:'Inter',sans-serif; box-sizing:border-box;
  }
  .ie-inner { max-width:1000px; margin:0 auto; display:flex; flex-direction:column; gap:22px; }
  @media(max-width:768px){.ie-page{padding:92px 16px 100px;}}
  @media(min-width:769px){.ie-page{padding-bottom:48px;}}

  .ie-glass {
    background:rgba(255,255,255,0.38);
    backdrop-filter:blur(20px) saturate(200%);
    -webkit-backdrop-filter:blur(20px) saturate(200%);
    border:1px solid rgba(255,255,255,0.62);
    box-shadow:0 8px 32px rgba(0,0,0,0.08),inset 0 1px 0 rgba(255,255,255,0.5);
    border-radius:22px; isolation:isolate;
  }

  .ie-urgent {
    border-radius:20px; padding:20px 22px;
    background:rgba(180,83,9,0.10);
    border:1.5px solid rgba(180,83,9,0.28);
    display:flex; gap:14px; align-items:flex-start;
    animation:ie-fadein 0.28s ease forwards;
  }
  .ie-urgent-icon { font-size:32px; flex-shrink:0; line-height:1; }
  .ie-urgent-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }

  .ie-fmt {
    border:1.5px solid rgba(255,255,255,0.65); border-radius:16px; padding:16px 18px;
    cursor:pointer; background:rgba(255,255,255,0.38);
    transition:all 0.18s cubic-bezier(0.34,1.2,0.64,1); text-align:left;
  }
  .ie-fmt:hover { background:rgba(255,255,255,0.60); transform:translateY(-2px); }
  .ie-fmt.on { border-color:rgba(192,57,43,0.40); background:rgba(192,57,43,0.07); box-shadow:0 4px 16px rgba(192,57,43,0.12); }

  .ie-btn {
    display:inline-flex; align-items:center; gap:8px;
    padding:11px 26px; border-radius:50px;
    background:#c0392b; color:#fff; border:none;
    font-family:'Inter',sans-serif; font-size:14px; font-weight:700;
    cursor:pointer; box-shadow:0 4px 16px rgba(192,57,43,0.30);
    transition:all 0.15s;
  }
  .ie-btn:hover { background:#a93226; transform:translateY(-1px); }
  .ie-btn:active { transform:scale(0.97); }
  .ie-btn:disabled { opacity:0.55; cursor:not-allowed; transform:none; }
  .ie-btn.blue { background:#1d4ed8; box-shadow:0 4px 16px rgba(29,78,216,0.28); }
  .ie-btn.blue:hover { background:#1e40af; }
  .ie-btn.sm { padding:7px 16px; font-size:13px; }

  .ie-ghost {
    background:rgba(255,255,255,0.50); color:#555;
    border:1px solid rgba(255,255,255,0.72); border-radius:50px;
    padding:9px 20px; font-size:13px; font-weight:600;
    font-family:'Inter',sans-serif; cursor:pointer; transition:background 0.15s;
  }
  .ie-ghost:hover { background:rgba(255,255,255,0.75); }
  .ie-ghost.sm { padding:6px 14px; font-size:12px; }

  .ie-drop {
    border:2px dashed rgba(192,57,43,0.28); border-radius:18px; padding:40px 24px;
    text-align:center; cursor:pointer; background:rgba(255,255,255,0.28); transition:all 0.20s;
  }
  .ie-drop:hover,.ie-drop.over { border-color:rgba(192,57,43,0.60); background:rgba(192,57,43,0.05); }

  .ie-wrap { overflow-x:auto; border-radius:14px; }
  .ie-tbl { width:100%; border-collapse:collapse; font-family:'Inter',sans-serif; font-size:12px; min-width:600px; }
  .ie-tbl th { background:rgba(255,255,255,0.50); padding:9px 12px; text-align:left; font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#888; border-bottom:1px solid rgba(0,0,0,0.07); }
  .ie-tbl td { padding:9px 12px; border-bottom:1px solid rgba(0,0,0,0.05); color:#333; vertical-align:middle; }
  .ie-tbl tr:last-child td { border-bottom:none; }
  .ie-tbl tr.invalid td { background:rgba(239,68,68,0.05); }
  .ie-tbl tr.conflict td { background:rgba(234,179,8,0.06); }
  .ie-tbl tr:hover td { background:rgba(255,255,255,0.45); }

  .ie-pill { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:700; }

  .ie-pb { height:6px; border-radius:999px; background:rgba(0,0,0,0.07); overflow:hidden; }
  .ie-pf { height:100%; border-radius:999px; background:#c0392b; transition:width 0.3s; }

  .ie-cfb { flex:1; border:1.5px solid rgba(255,255,255,0.65); border-radius:12px; padding:10px 8px; background:rgba(255,255,255,0.38); cursor:pointer; font-family:'Inter',sans-serif; transition:all 0.15s; text-align:center; }
  .ie-cfb.on { border-color:rgba(192,57,43,0.40); background:rgba(192,57,43,0.08); }
  .ie-cfb:hover { background:rgba(255,255,255,0.60); }

  @keyframes spin{to{transform:rotate(360deg)}}
  .ie-spin { width:17px; height:17px; border:2.5px solid rgba(192,57,43,0.22); border-top-color:#c0392b; border-radius:50%; animation:spin 0.7s linear infinite; flex-shrink:0; }
  .ie-spin.w { border-color:rgba(255,255,255,0.3); border-top-color:#fff; }

  @keyframes ie-fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .ie-anim { animation:ie-fadein 0.22s ease forwards; }
  .ie-lbl { font-size:10px; font-weight:700; letter-spacing:0.10em; text-transform:uppercase; color:#aaa; }
`;

/* ─────────────── Unregistered banner ───────────────────── */
function UnregisteredBanner({ onExport }: { onExport: () => void }) {
  const navigate = useNavigate();
  const auth = useAuth();
  const network = useNetworkStatus();

  return (
    <div className="ie-urgent">
      <div className="ie-urgent-icon">⚠️</div>
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: "#b45309",
            margin: "0 0 6px",
          }}
        >
          Your account isn't registered yet
        </p>
        <p
          style={{ fontSize: 13, color: "#92400e", lineHeight: 1.6, margin: 0 }}
        >
          You created your account while offline as{" "}
          <strong>{auth.offlineAccount?.name}</strong> for{" "}
          <strong>{auth.offlineAccount?.shopName}</strong>.
          {network.isOnline
            ? " You're now online — we can register it right now."
            : " You're still offline. Export your data below so it's safe no matter what."}
        </p>
        <div className="ie-urgent-actions">
          {network.isOnline && (
            <button className="ie-btn sm" onClick={() => auth.trySync()}>
              {auth.syncResult === "syncing" ? (
                <>
                  <div className="ie-spin w" />
                  Registering…
                </>
              ) : (
                "Register now →"
              )}
            </button>
          )}
          <button className="ie-btn sm blue" onClick={onExport}>
            ⬇ Export my data
          </button>
          <button className="ie-ghost sm" onClick={() => navigate("/login")}>
            Sign in instead
          </button>
          <button
            className="ie-ghost sm"
            style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.25)" }}
            onClick={() => {
              auth.discardOffline();
              navigate("/");
            }}
          >
            Discard offline account
          </button>
        </div>
        {auth.syncResult === "success" && (
          <p
            style={{
              fontSize: 13,
              color: "#15803d",
              fontWeight: 600,
              marginTop: 10,
            }}
          >
            ✅ Successfully registered! Your data is synced.
          </p>
        )}
        {auth.syncResult === "failed" && (
          <p
            style={{
              fontSize: 13,
              color: "#b91c1c",
              fontWeight: 600,
              marginTop: 10,
            }}
          >
            ❌ Couldn't reach server. Export your data to keep it safe.
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Export panel ──────────────────────────── */
// FIX: Receives exportItems as a prop instead of owning state
function ExportPanel({
  autoOpen = false,
  exportItems,
}: {
  autoOpen?: boolean;
  exportItems: InventoryItem[];
}) {
  const [format, setFormat] = useState<ExportFormat>("bundle");
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoOpen) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setFormat("bundle");
    }
  }, [autoOpen]);

  const fmts: {
    id: ExportFormat;
    icon: string;
    label: string;
    desc: string;
  }[] = [
    {
      id: "json",
      icon: "{ }",
      label: "JSON",
      desc: "Structured · ideal for re-import",
    },
    {
      id: "csv",
      icon: "📊",
      label: "CSV",
      desc: "Spreadsheet-compatible · Excel / Sheets",
    },
    {
      id: "bundle",
      icon: "📦",
      label: "Backup Bundle",
      desc: "Full backup with metadata — recommended",
    },
  ];

  const handleExport = async () => {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 350));
    // Use prop data; fall back to a fresh fetch if somehow empty
    const items = exportItems.length
      ? exportItems
      : await InventoryService.getAll();
    const ts = new Date().toISOString().slice(0, 10);
    if (format === "csv")
      download(toCSV(items), `theshop-inventory-${ts}.csv`, "text/csv");
    if (format === "json")
      download(
        toJSON(items),
        `theshop-inventory-${ts}.json`,
        "application/json",
      );
    if (format === "bundle")
      download(
        toBundle(items, { note: "offline-backup" }),
        `theshop-backup-${ts}.json`,
        "application/json",
      );
    setExporting(false);
    setDone(true);
    setTimeout(() => setDone(false), 3500);
  };

  return (
    <div ref={panelRef} className="ie-glass" style={{ padding: "24px 26px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 13,
            background: "rgba(192,57,43,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
          }}
        >
          ⬆️
        </div>
        <div>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#1a1a1a",
              margin: 0,
            }}
          >
            Export Data
          </h2>
          <p style={{ fontSize: 12, color: "#aaa", margin: "2px 0 0" }}>
            Download your inventory to a file — no internet required
          </p>
        </div>
      </div>

      <p className="ie-lbl" style={{ marginBottom: 10 }}>
        Choose format
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {fmts.map((f) => (
          <button
            key={f.id}
            className={`ie-fmt${format === f.id ? " on" : ""}`}
            onClick={() => setFormat(f.id)}
          >
            <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: format === f.id ? "#c0392b" : "#1a1a1a",
                marginBottom: 4,
              }}
            >
              {f.label}
            </div>
            <div style={{ fontSize: 11, color: "#888", lineHeight: 1.4 }}>
              {f.desc}
            </div>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div
        style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}
      >
        {[
          { l: "Items", v: exportItems.length },
          {
            l: "In Stock",
            v: exportItems.filter((i) => i.status === "in-stock").length,
          },
          {
            l: "Issues",
            v: exportItems.filter((i) => i.status !== "in-stock").length,
          },
          {
            l: "Total Value",
            v: `₹${exportItems.reduce((s, i) => s + i.price * i.stock, 0).toLocaleString()}`,
          },
        ].map((s) => (
          <div key={s.l}>
            <p className="ie-lbl" style={{ margin: 0 }}>
              {s.l}
            </p>
            <p
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "#1a1a1a",
                margin: "2px 0 0",
              }}
            >
              {s.v}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <button className="ie-btn" onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <>
              <div className="ie-spin w" />
              Preparing…
            </>
          ) : done ? (
            "✓ Downloaded!"
          ) : (
            `⬇ Export ${fmts.find((f) => f.id === format)?.label}`
          )}
        </button>
        <p style={{ fontSize: 11, color: "#bbb", margin: 0 }}>
          {exportItems.length} item{exportItems.length !== 1 ? "s" : ""} · works
          completely offline
        </p>
      </div>
    </div>
  );
}

/* ─────────────── Import panel ──────────────────────────── */
// FIX: Receives exportItems as a prop so existingSkus can be derived correctly
function ImportPanel({ exportItems }: { exportItems: InventoryItem[] }) {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [parsed, setParsed] = useState<ParsedItem[]>([]);
  const [conflictMode, setConflictMode] = useState<ConflictMode>("skip");
  const [progress, setProgress] = useState(0);
  const [errMsg, setErrMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // FIX: Now correctly derives from the prop, not an undefined variable
  const existingSkus = new Set(exportItems.map((i) => i.sku));

  const parseFile = useCallback(
    async (file: File) => {
      setStatus("parsing");
      setErrMsg("");
      try {
        const text = await file.text();
        let rows: Record<string, string>[] = [];
        if (file.name.endsWith(".csv")) {
          const lines = text.trim().split(/\r?\n/);
          const header = parseCSVLine(lines[0]).map((h) =>
            h.toLowerCase().trim(),
          );
          rows = lines
            .slice(1)
            .filter((l) => l.trim())
            .map((l) => {
              const v = parseCSVLine(l);
              return Object.fromEntries(
                header.map((h, i) => [h, (v[i] ?? "").trim()]),
              );
            });
        } else {
          const p = JSON.parse(text);
          rows = Array.isArray(p)
            ? p
            : p.items
              ? p.items
              : (p.data?.inventory ?? []);
        }
        setParsed(rows.map((r) => validateRow(r, existingSkus)));
        setStatus("preview");
      } catch (e) {
        setErrMsg(e instanceof Error ? e.message : "Could not parse file");
        setStatus("error");
      }
    },
    // Re-run if existing SKUs change (e.g. after a previous import)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exportItems],
  );

  // FIX: Actually calls InventoryService to persist imported items
  const handleImport = async () => {
    setStatus("importing");
    const validItems = parsed.filter((i) => i._valid);
    let completed = 0;

    for (const item of validItems) {
      const isConflict = item._conflict;

      if (isConflict && conflictMode === "skip") {
        // Skip — do nothing
      } else if (isConflict && conflictMode === "overwrite") {
        const existing = exportItems.find((e) => e.sku === item.sku);
        if (existing) {
          await InventoryService.update(existing.id, {
            name: item.name,
            sku: item.sku,
            brand: item.brand,
            category: item.category,
            price: item.price,
            stock: item.stock,
            status: item.status as InventoryItem["status"],
            barcode: item.barcode ?? "",
            image: item.image ?? "",
            lastUpdated: new Date().toISOString(),
          });
        }
      } else if (isConflict && conflictMode === "merge") {
        const existing = exportItems.find((e) => e.sku === item.sku);
        if (existing) {
          await InventoryService.update(existing.id, {
            stock: existing.stock + item.stock,
            lastUpdated: new Date().toISOString(),
          });
        }
      } else {
        // New item — create
        await InventoryService.add({
          name: item.name,
          sku: item.sku,
          brand: item.brand,
          category: item.category,
          price: item.price,
          stock: item.stock,
          status: item.status as InventoryItem["status"],
          barcode: item.barcode ?? "",
          image: item.image ?? "",
          lastUpdated: new Date().toISOString(),
        });
      }

      completed++;
      setProgress(Math.round((completed / validItems.length) * 100));
    }

    setImportedCount(validItems.length);
    setStatus("done");
  };

  const reset = () => {
    setStatus("idle");
    setParsed([]);
    setProgress(0);
    setErrMsg("");
    setImportedCount(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const valid = parsed.filter((i) => i._valid).length;
  const invalid = parsed.filter((i) => !i._valid).length;
  const conflict = parsed.filter((i) => i._conflict && i._valid).length;

  if (status === "done")
    return (
      <div
        className="ie-glass ie-anim"
        style={{ padding: "40px 26px", textAlign: "center" }}
      >
        <div style={{ fontSize: 52, marginBottom: 14 }}>✅</div>
        <h3
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "#1a1a1a",
            margin: "0 0 8px",
          }}
        >
          Import Complete
        </h3>
        <p style={{ fontSize: 14, color: "#666", margin: "0 0 22px" }}>
          {importedCount} item{importedCount !== 1 ? "s" : ""} added to
          inventory.
        </p>
        <button className="ie-btn" onClick={reset} style={{ margin: "0 auto" }}>
          Import Another File
        </button>
      </div>
    );

  return (
    <div className="ie-glass" style={{ padding: "24px 26px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 13,
            background: "rgba(59,130,246,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
          }}
        >
          ⬇️
        </div>
        <div>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#1a1a1a",
              margin: 0,
            }}
          >
            Import Data
          </h2>
          <p style={{ fontSize: 12, color: "#aaa", margin: "2px 0 0" }}>
            Upload CSV, JSON, or a TheShop backup bundle
          </p>
        </div>
      </div>

      {/* Drop zone */}
      {(status === "idle" || status === "parsing" || status === "error") && (
        <>
          <div
            className={`ie-drop${dragOver ? " over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) parseFile(f);
            }}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.json"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) parseFile(f);
              }}
            />
            {status === "parsing" ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  className="ie-spin"
                  style={{ width: 28, height: 28, borderWidth: 3 }}
                />
                <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
                  Parsing…
                </p>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#333",
                    margin: "0 0 6px",
                  }}
                >
                  Drop your file here
                </p>
                <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>
                  or{" "}
                  <span
                    style={{
                      color: "#c0392b",
                      fontWeight: 600,
                      textDecoration: "underline",
                    }}
                  >
                    click to browse
                  </span>
                </p>
                <p style={{ fontSize: 11, color: "#ccc", marginTop: 10 }}>
                  CSV · JSON · TheShop Backup (.json)
                </p>
              </>
            )}
          </div>

          {status === "error" && (
            <div
              className="ie-anim"
              style={{
                marginTop: 12,
                padding: "10px 14px",
                borderRadius: 12,
                background: "rgba(239,68,68,0.09)",
                border: "1px solid rgba(239,68,68,0.20)",
                color: "#b91c1c",
                fontSize: 13,
                display: "flex",
                gap: 8,
              }}
            >
              <span>⚠️</span>
              <span>{errMsg}</span>
            </div>
          )}

          <div
            style={{
              marginTop: 14,
              padding: "12px 16px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.40)",
              border: "1px solid rgba(255,255,255,0.65)",
            }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#555",
                margin: "0 0 8px",
              }}
            >
              📋 Need a template?
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="ie-ghost sm"
                onClick={() =>
                  download(
                    CSV_HEADERS.join(",") +
                      "\nSample Product,SKU-NEW,Brand,Category,999,10,in-stock,,,",
                    "theshop-template.csv",
                    "text/csv",
                  )
                }
              >
                ⬇ CSV Template
              </button>
              <button
                className="ie-ghost sm"
                onClick={() =>
                  download(
                    JSON.stringify(
                      [
                        {
                          name: "Sample Product",
                          sku: "SKU-NEW",
                          brand: "Brand",
                          category: "Category",
                          price: 999,
                          stock: 10,
                          status: "in-stock",
                          barcode: "",
                          image: "",
                        },
                      ],
                      null,
                      2,
                    ),
                    "theshop-template.json",
                    "application/json",
                  )
                }
              >
                ⬇ JSON Template
              </button>
            </div>
          </div>
        </>
      )}

      {/* Preview */}
      {(status === "preview" || status === "importing") && (
        <div className="ie-anim">
          {/* Summary */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            {[
              {
                l: "Total",
                v: parsed.length,
                bg: "rgba(59,130,246,0.10)",
                c: "#3b82f6",
              },
              {
                l: "✓ Valid",
                v: valid,
                bg: "rgba(34,197,94,0.10)",
                c: "#15803d",
              },
              {
                l: "✕ Errors",
                v: invalid,
                bg: "rgba(239,68,68,0.10)",
                c: "#b91c1c",
              },
              {
                l: "⚠ Conflicts",
                v: conflict,
                bg: "rgba(234,179,8,0.10)",
                c: "#a16207",
              },
            ].map((s) => (
              <div
                key={s.l}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  background: s.bg,
                  color: s.c,
                }}
              >
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    margin: 0,
                  }}
                >
                  {s.l}
                </p>
                <p style={{ fontSize: 22, fontWeight: 800, margin: "2px 0 0" }}>
                  {s.v}
                </p>
              </div>
            ))}
          </div>

          {/* Conflict mode */}
          {conflict > 0 && (
            <div
              style={{
                marginBottom: 16,
                padding: "14px 16px",
                borderRadius: 14,
                background: "rgba(234,179,8,0.08)",
                border: "1px solid rgba(234,179,8,0.20)",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#a16207",
                  margin: "0 0 10px",
                }}
              >
                ⚠️ {conflict} SKU{conflict !== 1 ? "s" : ""} already exist — how
                to handle?
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {(
                  [
                    { id: "skip", icon: "⏭", l: "Skip", d: "Keep existing" },
                    {
                      id: "overwrite",
                      icon: "♻️",
                      l: "Overwrite",
                      d: "Replace with import",
                    },
                    {
                      id: "merge",
                      icon: "🔀",
                      l: "Merge",
                      d: "Add stock counts",
                    },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.id}
                    className={`ie-cfb${conflictMode === o.id ? " on" : ""}`}
                    onClick={() => setConflictMode(o.id)}
                  >
                    <div style={{ fontSize: 18, marginBottom: 4 }}>
                      {o.icon}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: conflictMode === o.id ? "#c0392b" : "#333",
                      }}
                    >
                      {o.l}
                    </div>
                    <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>
                      {o.d}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Progress */}
          {status === "importing" && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
                  Importing…
                </span>
                <span
                  style={{ fontSize: 12, fontWeight: 700, color: "#c0392b" }}
                >
                  {progress}%
                </span>
              </div>
              <div className="ie-pb">
                <div className="ie-pf" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Table */}
          <p className="ie-lbl" style={{ marginBottom: 8 }}>
            Preview — {parsed.length} row{parsed.length !== 1 ? "s" : ""}
          </p>
          <div
            className="ie-wrap"
            style={{
              marginBottom: 16,
              maxHeight: 280,
              overflowY: "auto",
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.07)",
            }}
          >
            <table className="ie-tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Brand</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Validation</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((item, i) => (
                  <tr
                    key={i}
                    className={
                      !item._valid
                        ? "invalid"
                        : item._conflict
                          ? "conflict"
                          : ""
                    }
                  >
                    <td style={{ color: "#bbb", fontSize: 11 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600, color: "#1a1a1a" }}>
                      {item.name || <span style={{ color: "#e0a0a0" }}>—</span>}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 11 }}>
                      {item.sku || <span style={{ color: "#e0a0a0" }}>—</span>}
                    </td>
                    <td>{item.brand}</td>
                    <td>₹{item.price.toLocaleString()}</td>
                    <td>{item.stock}</td>
                    <td>
                      <span
                        className="ie-pill"
                        style={{
                          background:
                            item.status === "in-stock"
                              ? "rgba(34,197,94,0.12)"
                              : item.status === "low-stock"
                                ? "rgba(234,179,8,0.12)"
                                : "rgba(239,68,68,0.12)",
                          color:
                            item.status === "in-stock"
                              ? "#15803d"
                              : item.status === "low-stock"
                                ? "#a16207"
                                : "#b91c1c",
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {!item._valid ? (
                        <span
                          className="ie-pill"
                          style={{
                            background: "rgba(239,68,68,0.12)",
                            color: "#b91c1c",
                          }}
                        >
                          ✕ {item._errors[0]}
                        </span>
                      ) : item._conflict ? (
                        <span
                          className="ie-pill"
                          style={{
                            background: "rgba(234,179,8,0.12)",
                            color: "#a16207",
                          }}
                        >
                          ⚠ Conflict
                        </span>
                      ) : (
                        <span
                          className="ie-pill"
                          style={{
                            background: "rgba(34,197,94,0.12)",
                            color: "#15803d",
                          }}
                        >
                          ✓ OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="ie-ghost" onClick={reset}>
              ← Back
            </button>
            <button
              className="ie-btn"
              disabled={valid === 0 || status === "importing"}
              onClick={handleImport}
            >
              {status === "importing" ? (
                <>
                  <div className="ie-spin w" />
                  Importing…
                </>
              ) : (
                `⬆ Import ${valid} Valid Item${valid !== 1 ? "s" : ""}`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── Page ──────────────────────────────────── */
export default function ImportExport() {
  const [searchParams] = useSearchParams();
  const isUnregisteredCtx = searchParams.get("reason") === "unregistered";
  const auth = useAuth();

  const [autoOpenExport, setAutoOpenExport] = useState(isUnregisteredCtx);

  // FIX: Single source of truth — both panels share the same data
  const [exportItems, setExportItems] = useState<InventoryItem[]>([]);
  useEffect(() => {
    InventoryService.getAll().then(setExportItems);
  }, []);

  const showUrgent = auth.status === "offline-pending";

  return (
    <>
      <style>{CSS}</style>
      <div className="ie-page">
        <div className="ie-inner">
          <div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "#1a1a1a",
                letterSpacing: "-0.03em",
                margin: 0,
              }}
            >
              Import &amp; Export
            </h1>
            <p style={{ fontSize: 13, color: "#aaa", margin: "4px 0 0" }}>
              Transfer data without needing a server — works 100% offline
            </p>
          </div>

          {showUrgent && (
            <UnregisteredBanner onExport={() => setAutoOpenExport(true)} />
          )}

          {!showUrgent && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                background: "rgba(59,130,246,0.08)",
                border: "1px solid rgba(59,130,246,0.18)",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
              <p
                style={{
                  fontSize: 12,
                  color: "#3b82f6",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                <strong style={{ color: "#1d4ed8" }}>Works offline.</strong>{" "}
                Export creates a file on your device. Import reads from a file.
                Use this to back up data, move between devices, or bulk-load
                from a spreadsheet.
              </p>
            </div>
          )}

          {/* FIX: Pass exportItems down to both panels */}
          <ExportPanel autoOpen={autoOpenExport} exportItems={exportItems} />
          <ImportPanel exportItems={exportItems} />
        </div>
      </div>
    </>
  );
}
