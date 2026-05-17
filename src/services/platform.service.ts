// ─────────────────────────────────────────────────────────────
// src/services/platform.service.ts
// ─────────────────────────────────────────────────────────────

export type Platform = "web" | "android" | "ios" | "desktop";

export const PlatformService = {
  get(): Platform {
    const cap = (window as any)?.Capacitor;
    if (!cap?.isNativePlatform()) return "web";

    const p: string = cap.getPlatform();
    if (p === "android") return "android";
    if (p === "ios")     return "ios";
    return "desktop";
  },

  isNative(): boolean {
    return PlatformService.get() !== "web";
  },

  isMobile(): boolean {
    const p = PlatformService.get();
    return p === "android" || p === "ios";
  },

  /** Can use native camera APIs */
  hasCamera(): boolean {
    return PlatformService.isNative() || !!navigator.mediaDevices?.getUserMedia;
  },
};
