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
    // Exclude both sql.js variants from pre-bundling — they contain WASM
    exclude: ["sql.js", "sql.js/dist/sql-wasm-browser.js"],
  },

  server: {
    headers: {
      "Cross-Origin-Opener-Policy":   "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
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

  publicDir: "public",
});
