// src/services/api.service.ts
//
// Central HTTP client. Server URL comes from VITE_API_URL only —
// never from user input or localStorage.

// Ensure the URL always has a protocol — guards against VITE_API_URL
// being set without https:// in Vercel (e.g. "myapp.railway.app" instead of "https://myapp.railway.app")
function normaliseUrl(raw: string | undefined): string {
  const url = (raw ?? "http://localhost:4000").trim().replace(/\/$/, "");
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}
const BASE = normaliseUrl(import.meta.env.VITE_API_URL);
const K_TOKEN = "theshop_auth_token";

function getToken(): string | null {
  const t = localStorage.getItem(K_TOKEN);
  return !t || t === "offline" ? null : t;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const ApiService = {
  get<T>(path: string):                    Promise<T> { return request<T>(path); },
  post<T>(path: string, body: unknown):   Promise<T> { return request<T>(path, { method: "POST",   body: JSON.stringify(body) }); },
  patch<T>(path: string, body: unknown):  Promise<T> { return request<T>(path, { method: "PATCH",  body: JSON.stringify(body) }); },
  put<T>(path: string, body: unknown):    Promise<T> { return request<T>(path, { method: "PUT",    body: JSON.stringify(body) }); },
  delete<T>(path: string):               Promise<T> { return request<T>(path, { method: "DELETE" }); },
  async ping(): Promise<boolean> {
    try { await request<{ ok: boolean }>("/api/ping"); return true; }
    catch { return false; }
  },
};
