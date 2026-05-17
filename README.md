# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
### ByClaude
# TheShop — Architecture Guide

## Folder Structure

```
theshop/
├── dist/
├── src/
│   ├── app/
│   │   ├── App.tsx           ← root: DB init + sync startup
│   │   ├── OnlineGate.tsx
│   │   ├── routes.tsx        ← React Router v6 routes
│   │   └── SyncStatusBar.tsx
│   │
│   ├── components/
│   │   └── navbar/
│   │         ├── MenuSlide.tsx
│   │         └── Navbar.tsx
│   │
│   ├── database/
│   │   ├── adapters/
│   │   │   ├── native.adapter.ts  ← @capacitor-community/sqlite
│   │   │   └── web.adapter.ts     ← sql.js + IndexedDB persistence
│   │   ├── index.ts          ← getAdapter(), initDatabase(), query(), run()
│   │   ├── migrations.ts     ← versioned migrations runner
│   │   └── schema.ts         ← CREATE TABLE DDL
│   │   
│   ├── hooks/
│   │   ├── useFeature.ts
│   │   ├── useNetworkStatus.ts
│   │   └── useSyncStatus.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.types.ts
│   │   │   ├── AuthPage.tsx
│   │   │   ├── OfflineRegistrationBanner.tsx
│   │   │   └── useAuth.ts
│   │   │
│   │   ├── customers/        ← (next module)
│   │   │
│   │   ├── home/
│   │   │   └── Home.tsx
│   │   │
│   │   ├── importexport/
│   │   │   └── ImportExport.tsx
│   │   │
│   │   ├── inventory/
│   │   │   ├── components/
│   │   │   │   ├── AddProductModal.tsx   ← add + barcode lookup
│   │   │   │   ├── BarcodeScanner.tsx    ← camera scanner (web + native)
│   │   │   │   ├── DeleteConfirmModal.tsx
│   │   │   │   ├── EditProductModal.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   ├── InventoryFilters.tsx
│   │   │   │   ├── InventoryGrid.tsx
│   │   │   │   ├── InventoryHeader.tsx
│   │   │   │   ├── InventoryItemCard.tsx
│   │   │   │   ├── InventoryItemRow.tsx
│   │   │   │   ├── InventoryList.tsx
│   │   │   │   └── InventoryStats.tsx
│   │   │   │
│   │   │   └── pages/
│   │   │       ├── inventory.service.ts      ← all DB + API calls
│   │   │       ├── Inventory.tsx         ← page orchestrator
│   │   │       └── inventory.types.ts        ← shared types
│   │   │
│   │   ├── notifications/
│   │   │   └── ImportExport.tsx
│   │   ├── reports/        ← (next module)
│   │   ├── sales/            ← (next module)
│   │   └── settings/
│   │       └── Settings.tsx
│   │
│   ├── services/
│   │   ├── api.service.ts         ← HTTP client (fetch + auth header)
│   │   ├── features.ts
│   │   └── platform.service.ts    ← web / android / ios detection
│   │
│   ├── sync/
│   │   ├── conflict.resolver.ts
│   │   ├── network.listener.ts
│   │   ├── offline.types.ts
│   │   └── Sync.engine.client.ts
│   │
│   ├── design-tokens.ts
│   ├── index.css
│   └── main.tsx
│
├── capacitor.config.ts
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Data Flow

```
React UI  (Inventory.tsx)
    ↓  calls
InventoryService  (inventory.service.ts)
    ↓  calls
database/index.ts  →  query() / run()
    ↓  routes to
Platform Adapter
    ├── Web    → sql.js WASM + IndexedDB persistence
    └── Native → @capacitor-community/sqlite (iOS / Android)
         ↓
        SQLite file on device
              ↓
        sync_queue table
              ↓
        SyncEngine  (triggered by NetworkListener)
              ↓
        Central Backend API  (VITE_API_URL)
```

## Barcode Scanner Flow

```
User taps "📷 Scan Barcode"
    ↓
PlatformService.isNative()?
    ├── YES → @capacitor-community/barcode-scanner (native camera UI)
    └── NO  → ZXing BrowserMultiFormatReader (getUserMedia)
         ↓
barcode string detected
    ↓
InventoryService.getByBarcode()  ← check local DB first
    ↓  not found
InventoryService.lookupBarcode() ← Open Food Facts API → UPC Item DB
    ↓
auto-fills AddProductModal form
    ↓
user confirms → InventoryService.add() → sync_queue enqueued
```

## Sync Strategy

- Every write (`add`, `update`, `delete`) appends a row to `sync_queue`.
- `NetworkListener` fires `SyncEngine.sync()` when the device comes online.
- `SyncEngine` drains the queue with exponential back-off (up to 5 retries).
- On 409 Conflict, `ConflictResolver` merges changes: last-write-wins for
  most fields, but **stock changes are additive** (safe for concurrent edits
  from multiple devices).

## Adding a New Module

1. Create `src/modules/<name>/`
2. Add types to `<name>.types.ts`
3. Add SQL table to `src/database/schema.ts`
4. Add a migration entry in `src/database/migrations.ts`
5. Implement `<name>.service.ts` using `query()` / `run()` from `src/database`
6. Add a route in `src/app/routes.tsx`

## Environment Variables

| Variable         | Default                       | Description              |
|------------------|-------------------------------|--------------------------|
| `VITE_API_URL`   | `https://api.theshop.app`     | Central backend base URL |

## Mobile Build

```bash
npm run build
npx cap sync
npx cap open android   # or ios
```

Camera permission is requested automatically by the barcode scanner.
Add to `android/app/src/main/AndroidManifest.xml` if needed:
```xml
<uses-permission android:name="android.permission.CAMERA" />
```


### personal
theshop/
├── dist/
├── src/
│   ├── app/
│   │   ├── App.tsx           ← root: DB init + sync startup
│   │   ├── OnlineGate.tsx
│   │   ├── routes.tsx        ← React Router v6 routes
│   │   └── SyncStatusBar.tsx
│   │
│   ├── components/
│   │   └── navbar/
│   │         ├── MenuSlide.tsx
│   │         └── Navbar.tsx
│   │
│   ├── database/
│   │   ├── adapters/
│   │   │   ├── native.adapter.ts  ← @capacitor-community/sqlite
│   │   │   └── web.adapter.ts     ← sql.js + IndexedDB persistence
│   │   ├── index.ts          ← getAdapter(), initDatabase(), query(), run()
│   │   ├── migrations.ts     ← versioned migrations runner
│   │   └── schema.ts         ← CREATE TABLE DDL
│   │   
│   ├── hooks/
│   │   ├── useFeature.ts
│   │   ├── useNetworkStatus.ts
│   │   └── useSyncStatus.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.types.ts
│   │   │   ├── AuthPage.tsx
│   │   │   ├── OfflineRegistrationBanner.tsx
│   │   │   └── useAuth.ts
│   │   │
│   │   ├── customers/        ← (next module)
│   │   │
│   │   ├── home/
│   │   │   └── Home.tsx
│   │   │
│   │   ├── importexport/
│   │   │   └── ImportExport.tsx
│   │   │
│   │   ├── inventory/
│   │   │   ├── components/
│   │   │   │   ├── AddProductModal.tsx   ← add + barcode lookup
│   │   │   │   ├── BarcodeScanner.tsx    ← camera scanner (web + native)
│   │   │   │   ├── DeleteConfirmModal.tsx
│   │   │   │   ├── EditProductModal.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   ├── InventoryFilters.tsx
│   │   │   │   ├── InventoryGrid.tsx
│   │   │   │   ├── InventoryHeader.tsx
│   │   │   │   ├── InventoryItemCard.tsx
│   │   │   │   ├── InventoryItemRow.tsx
│   │   │   │   ├── InventoryList.tsx
│   │   │   │   └── InventoryStats.tsx
│   │   │   │
│   │   │   └── pages/
│   │   │       ├── inventory.service.ts      ← all DB + API calls
│   │   │       ├── Inventory.tsx         ← page orchestrator
│   │   │       └── inventory.types.ts        ← shared types
│   │   │
│   │   ├── notifications/
│   │   │   └── ImportExport.tsx
│   │   ├── reports/        ← (next module)
│   │   ├── sales/            ← (next module)
│   │   └── settings/
│   │       └── Settings.tsx
│   │
│   ├── services/
│   │   ├── api.service.ts         ← HTTP client (fetch + auth header)
│   │   ├── features.ts
│   │   └── platform.service.ts    ← web / android / ios detection
│   │
│   ├── sync/
│   │   ├── conflict.resolver.ts
│   │   ├── network.listener.ts
│   │   ├── offline.types.ts
│   │   └── Sync.engine.client.ts
│   │
│   ├── design-tokens.ts
│   ├── index.css
│   └── main.tsx
│
├── capacitor.config.ts
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts



┌─────────────────────────────────────────────────────────┐
│                     React UI Layer                       │
│  Inventory.tsx · Modals · Cards · Filters · Stats        │
│                                                          │
│  Hooks: useNetworkStatus · useFeature · useSyncStatus    │
│  Gates: <OnlineGate> · <GatedButton>                     │
│  Bar:   <SyncStatusBar>                                  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                   Service Layer                          │
│  inventory.service.ts                                    │
│  • All reads/writes → local SQLite (always offline)      │
│  • lookupBarcode() → DB cache → online API               │
│  • Every write calls enqueueSync()                       │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                  Database Layer                          │
│  database/index.ts  →  query() / run()                   │
│       │                                                  │
│       ├── Web    → sql.js WASM + IndexedDB persistence   │
│       └── Native → @capacitor-community/sqlite           │
│                                                          │
│  Tables: inventory · sync_queue · meta · barcode_cache   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                   Sync Layer                             │
│  sync_queue (SQLite table)                               │
│       ↓  when online                                     │
│  SyncEngine → drains FIFO → POST /sync                   │
│       ↓  on 409                                          │
│  ConflictResolver → merged record → re-queued            │
│                                                          │
│  NetworkListener → online event → syncEngine.sync()      │
│  useNetworkStatus → HEAD /ping every 30s                 │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│               Central Backend API                        │
│  POST /sync  ·  GET /ping  ·  Auth endpoints             │
│  (optional — app works fully without this)               │
└─────────────────────────────────────────────────────────┘




Feature Availability
Feature                                         Offline                 Online
View / Add / Edit / Delete inventory            ✅ Full                 ✅ Full
Scan barcode (camera)                           ✅ Full                 ✅ Full
Barcode product auto-fill                       ⚡Cache only            ✅ Live lookup
Image upload                                    ❌                      ✅ 
Sync to cloud                                   ⏳ Queued               ✅ Auto
Pull remote changes                             ⏳ Deferred             ✅ Auto
Basic reports                                   ✅ Full                 ✅ Full
Advanced analytics / export                     ❌                      ✅ 
Create invoice                                  ✅ Full                 ✅ + syncs
Process payment                                 ❌                      ✅
Login (new session)                             ❌                      ✅


# TheShop — Offline-First Architecture

## Core Principle

> **The app works fully without any network. The network only adds extra features or faster sync.**

Every user action — viewing, adding, editing, deleting — writes to local SQLite first and returns immediately. The network is never in the critical path.

---

## Feature Availability Map

| Feature                  | Offline | Online | Notes |
|--------------------------|---------|--------|-------|
| View inventory           | ✅ Full  | ✅ Full | Local SQLite |
| Add product (manual)     | ✅ Full  | ✅ Full | Writes locally, queued for sync |
| Edit product             | ✅ Full  | ✅ Full | Same |
| Delete product           | ✅ Full  | ✅ Full | Same |
| Scan barcode (camera)    | ✅ Full  | ✅ Full | ZXing/Capacitor — no network needed |
| Barcode product lookup   | ⚡ Cache | ✅ Full | Offline: from local cache only |
| Image upload             | ❌ N/A  | ✅ Full | URL entry always works offline |
| Sync to cloud            | ⏳ Queue | ✅ Auto | Queued locally, pushed when online |
| Pull remote changes      | ❌ Wait  | ✅ Auto | Downloads when online |
| Basic reports            | ✅ Full  | ✅ Full | Local aggregations |
| Advanced analytics       | ❌ N/A  | ✅ Full | Requires server-side compute |
| Export reports           | ❌ N/A  | ✅ Full | Requires server |
| View invoices            | ✅ Full  | ✅ Full | Local data |
| Create invoice           | ✅ Full  | ✅ Full | Queued for sync |
| Process payment          | ❌ N/A  | ✅ Full | Payment gateway requires connection |
| Login (new session)      | ❌ N/A  | ✅ Full | Existing session remains active offline |

Legend: ✅ Works fully  ⚡ Degraded (partial)  ⏳ Deferred  ❌ Not available

---

## Data Flow

```
User Action
    │
    ▼
Local SQLite  ◄──── Always the primary store
    │
    ├─ Reads:   Return immediately from local DB
    │
    └─ Writes:  1. Write to local table (instant)
                2. Append row to sync_queue
                3. If online → SyncEngine.sync() (background)
                   If offline → stays in queue until online

                              ▼ when online ▼

                         SyncEngine
                              │
                    drains sync_queue FIFO
                              │
                    POST /sync to backend
                              │
                    ┌─────────┴──────────┐
                   200 OK             409 Conflict
                    │                     │
               DELETE from queue    ConflictResolver
               UPDATE syncedAt=now       │
                                   merged record
                                    re-queued
```

---

## Key Files

```
src/
├── sync/
│   ├── offline.types.ts      ← all offline-first types
│   ├── sync.engine.ts        ← queue + push + retry + conflict
│   ├── conflict.resolver.ts  ← last-write-wins + additive stock
│   └── network.listener.ts   ← online event → sync trigger
│
├── hooks/
│   ├── useNetworkStatus.ts   ← reactive network state (ping-verified)
│   ├── useFeature.ts         ← feature availability based on network
│   └── useSyncStatus.ts      ← reactive sync queue summary
│
├── services/
│   └── features.ts           ← SINGLE SOURCE OF TRUTH for feature availability
│
├── app/
│   ├── SyncStatusBar.tsx     ← persistent UI: network + pending + last sync
│   └── OnlineGate.tsx        ← wraps features: hard gate / soft gate / gated button
│
└── database/
    └── schema.ts             ← added barcode_cache table for offline lookup
```

---

## Offline Architecture Patterns Used

### 1. Write-Ahead Queue
Every write goes to `sync_queue` with `status='pending'`. The app never waits for the server to confirm before returning to the user.

### 2. Barcode Cache
When a barcode is looked up online, the result is stored in `barcode_cache`. The next scan of the same barcode works even offline, and on an airplane.

### 3. Ping-Verified Online Status
`useNetworkStatus` goes beyond `navigator.onLine`. It fires a real `HEAD /ping` to verify the backend is reachable (catches captive portals, LAN-only connections, etc.). Checks every 30 seconds while "online".

### 4. Feature Capability Map
`src/services/features.ts` is the single place that declares every feature as `"always"`, `"online"`, or `"enhanced"`. No feature flag logic is scattered in components.

### 5. `OnlineGate` Component
Two modes:
- **Hard gate** (`<OnlineGate feature="BILLING_PAYMENT">`) — renders a disabled placeholder when offline
- **Soft gate** (`<OnlineGate feature="BARCODE_SCAN" soft>`) — always renders but shows an offline note banner

### 6. Additive Stock Merge
When two devices both reduce stock while offline and then sync, the conflict resolver merges stock changes **additively** rather than last-write-wins, preventing ghost inventory.

### 7. Sync Status Indicator
`SyncStatusBar` shows a persistent bottom bar whenever there's anything to communicate: offline status, pending count, failed syncs, last sync time, and manual retry button.

---

## Adding a New Feature

1. Add it to `src/services/features.ts` with the right `availability`
2. Wrap it in `<OnlineGate feature="YOUR_FEATURE">` or `<GatedButton>`
3. If it writes data, call `enqueueSync()` from the service
4. If it needs offline data, add a cache table in `schema.ts`

---

## Sync Queue Statuses

| Status     | Meaning |
|------------|---------|
| `pending`  | Waiting to be pushed (offline or not yet attempted) |
| `syncing`  | Currently being POSTed to backend |
| `synced`   | Successfully acknowledged — row deleted |
| `failed`   | Exhausted retries — needs manual intervention |
| `conflict` | Server returned 409 — being resolved |
