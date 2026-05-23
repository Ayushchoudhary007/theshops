// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },

  optimizeDeps: {
    // sql.js ships a WASM binary — Vite must NOT pre-bundle it
    exclude: ["sql.js"],
  },

  server: {
    headers: {
      // Required for SharedArrayBuffer used by sql.js WASM
      "Cross-Origin-Opener-Policy":   "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    proxy: {
      "/api": {
        target:       "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-zxing":  ["@zxing/browser"],
        },
      },
    },
  },

  // Ensure the WASM file in public/ is copied to dist/ during build.
  // Vite does this automatically for files in public/ — no extra config needed.
  // The locateFile: (f) => `/${f}` in web.adapter.ts points to /sql-wasm.wasm
  // which maps to public/sql-wasm.wasm in dev and dist/sql-wasm.wasm in prod.
  publicDir: "public",
});
