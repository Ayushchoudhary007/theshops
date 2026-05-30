// scripts/copy-wasm.cjs
// Copies BOTH wasm files sql.js needs to public/
// sql-wasm-browser.js (used in browser) requests: sql-wasm-browser.wasm
// Runs automatically before every build and dev start.

const fs   = require("fs");
const path = require("path");
const dist = path.resolve(__dirname, "../node_modules/sql.js/dist");
const pub  = path.resolve(__dirname, "../public");

if (!fs.existsSync(pub)) fs.mkdirSync(pub, { recursive: true });

const files = ["sql-wasm-browser.wasm", "sql-wasm.wasm"];
for (const file of files) {
  const src  = path.join(dist, file);
  const dest = path.join(pub, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    const size = (fs.statSync(dest).size / 1024).toFixed(0);
    const ver  = require("../node_modules/sql.js/package.json").version;
    console.log(`[copy-wasm] ✓ ${file} (${size} KB) from sql.js v${ver} → public/`);
  } else {
    console.warn(`[copy-wasm] ⚠ ${file} not found in dist/`);
  }
}
