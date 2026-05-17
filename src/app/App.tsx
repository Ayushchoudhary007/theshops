// src/app/App.tsx

import { useEffect, useState } from "react";
import { initDatabase } from "../database";
import { runMigrations } from "../database/migrations";
import { networkListener } from "../sync/network.listener";
import { SyncStatusBar } from "./SyncStatusBar";
import AppRoutes from "./routes";

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        await runMigrations();
        networkListener.start();
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to start app");
      }
    })();
    return () => networkListener.stop();
  }, []);

  if (error) {
    return (
      <div style={{ padding: 32, fontFamily: "Inter, sans-serif" }}>
        <h2 style={{ color: "#dc2626" }}>Startup Error</h2>
        <p style={{ color: "#6b7280" }}>{error}</p>
        <p style={{ fontSize: 13, color: "#94a3b8" }}>
          The app requires local storage to work. Check browser permissions.
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        fontFamily: "Inter, sans-serif", gap: 12,
        background: "linear-gradient(135deg,#fce4e4 0%,#fde8d8 20%,#fef9c3 40%,#dcfce7 60%,#dbeafe 80%,#ede9fe 100%)",
      }}>
        <div style={{ fontSize: 40 }}>🛍️</div>
        <p style={{ color: "#6b7280", margin: 0, fontWeight: 500 }}>Starting TheShop…</p>
      </div>
    );
  }

  return (
    <>
      <SyncStatusBar />
      <AppRoutes />
    </>
  );
}
