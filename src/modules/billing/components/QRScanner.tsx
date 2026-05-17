// src/modules/billing/components/QRScanner.tsx
//
// Reuses ZXing (already in package.json) to scan QR codes.
// Uses BrowserMultiFormatReader.decodeFromVideoDevice — the correct
// ZXing/browser API — instead of the non-existent decodeFromCanvas.

import { useEffect, useRef, useState } from "react";
import { BRAND, GLASS, RADIUS, COLOR } from "../../../design-tokens";

interface Props {
  onResult: (raw: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onResult, onClose }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let reader: any;
    let cancelled = false;

    async function start() {
      try {
        setScanning(true);
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        reader = new BrowserMultiFormatReader();

        // decodeFromVideoDevice streams from the camera into the <video>
        // element and fires the callback for every successful decode.
        await reader.decodeFromVideoDevice(
          undefined,           // undefined = default camera (rear on mobile)
          videoRef.current!,
          (result: any, {/*err: any*/}) => {
            if (cancelled) return;
            if (result) {
              cancelled = true;
              stop();
              onResult(result.getText());
            }
            // err is thrown on every empty frame — safe to ignore
          }
        );
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Camera access denied");
          setScanning(false);
        }
      }
    }

    function stop() {
      try {
        reader?.reset?.();
      } catch {
        // ignore reset errors
      }
    }

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [onResult]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.55)", display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        ...GLASS, borderRadius: RADIUS.card,
        padding: 24, width: 380, maxWidth: "92vw",
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: COLOR.text }}>Scan QR Code</h3>
          <button
            onClick={onClose}
            style={{ fontSize: 20, background: "none", border: "none", cursor: "pointer", color: COLOR.textSoft }}
          >
            ✕
          </button>
        </div>

        {error ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
            <div style={{ fontSize: 13, color: "#b91c1c", marginBottom: 8 }}>{error}</div>
            <div style={{ fontSize: 12, color: COLOR.textSoft }}>
              Check camera permissions and try again.
            </div>
          </div>
        ) : (
          <>
            <div style={{
              borderRadius: RADIUS.item, overflow: "hidden",
              position: "relative", background: "#000", aspectRatio: "1",
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {/* Finder overlay */}
              <div style={{
                position: "absolute", inset: 0, display: "flex",
                alignItems: "center", justifyContent: "center",
                pointerEvents: "none",
              }}>
                <div style={{
                  width: 180, height: 180, border: `3px solid ${BRAND}`,
                  borderRadius: 12, boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
                }} />
              </div>
              {scanning && (
                <div style={{
                  position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
                  fontSize: 11, color: "#fff", background: "rgba(0,0,0,0.5)",
                  padding: "3px 10px", borderRadius: 99,
                }}>
                  Looking for QR…
                </div>
              )}
            </div>
            <div style={{ fontSize: 12, color: COLOR.textSoft, textAlign: "center" }}>
              Point camera at customer QR code.<br />
              QR must contain JSON <code>{`{"name":"…","phone":"…"}`}</code> or a phone number.
            </div>
          </>
        )}

        <button className="iv-btn-ghost" onClick={onClose} style={{ width: "100%" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
