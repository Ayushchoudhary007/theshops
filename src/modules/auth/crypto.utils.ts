// ─────────────────────────────────────────────────────────────
// src/modules/auth/crypto.utils.ts
//
// Browser-native password hashing using the Web Crypto API.
// SHA-256 is used for LOCAL credential storage only — it lets
// the app verify offline logins without storing plaintext.
//
// This is NOT used for server communication — the server handles
// its own password hashing (bcrypt). This is only for the local
// "remember me on this device" offline login cache.
// ─────────────────────────────────────────────────────────────

/**
 * Hash a password with SHA-256 using the Web Crypto API.
 * Returns a lowercase hex string.
 * Uses a fixed app-level salt so the hash is deterministic per device.
 */
const APP_SALT = "theshop_local_v1"; // static salt for local storage

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data    = encoder.encode(`${APP_SALT}:${password}`);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify a plaintext password against a stored hash.
 */
export async function verifyPassword(
  password: string,
  hash:     string,
): Promise<boolean> {
  const candidate = await hashPassword(password);
  return candidate === hash;
}

/**
 * Generate a unique local ID for offline records.
 * Format: "local_<timestamp>_<random4>"
 */
export function generateLocalId(): string {
  const ts     = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  return `local_${ts}_${random}`;
}

/**
 * Generate a unique sync queue item ID.
 */
export function generateQueueId(): string {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
