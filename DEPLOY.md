# TheShop Frontend — Deployment Guide

## Quick start (local dev)

```bash
npm install
cp .env.example .env
# Edit .env: set VITE_API_URL=http://localhost:4000
npm run dev
```

Make sure the TheShop server v4 is running on port 4000.

---

## Environment variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | Full URL of your TheShop server v4 (no trailing slash) |

---

## Deploy to Vercel (recommended)

1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Framework: **Vite**
4. Add environment variable: `VITE_API_URL=https://your-server.railway.app`
5. Add `vercel.json` for SPA routing:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

---

## Deploy to Netlify

1. Build command: `npm run build`
2. Publish directory: `dist`
3. Add env var: `VITE_API_URL=https://your-server.railway.app`
4. Add `public/_redirects`:

```
/*  /index.html  200
```

---

## Deploy to Railway (frontend + backend together)

Add a second service in Railway pointing to this frontend repo:
- Build: `npm run build`
- Start: `npx serve dist -p $PORT`
- Env: `VITE_API_URL=https://your-backend-service.railway.app`

---

## Capacitor (iOS / Android)

```bash
npm run build
npx cap sync android   # or ios
npx cap open android   # opens Android Studio
```

The server URL is baked into the build — make sure `VITE_API_URL` points
to a publicly reachable HTTPS server before building for mobile.

For the server CORS setting, add `capacitor://localhost` and `http://localhost`:
```
CORS_ORIGIN=https://yourshop.com,capacitor://localhost,http://localhost
```
