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
    // sql.js ships a WASM binary — Vite must NOT pre-bundle it.
    exclude: ["sql.js"],
  },

  server: {
    headers: {
      // Required for SharedArrayBuffer used by sql.js WASM
      "Cross-Origin-Opener-Policy":   "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    proxy: {
      // Dev proxy — avoids CORS issues when server is on :4000
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

  // Needed for Netlify / Vercel SPA routing
  // (also set _redirects or vercel.json — see deployment section in README)
});
