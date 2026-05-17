// src/hooks/useNotifications.ts
//
// Reactive hook — any component can subscribe to the unread count
// and full notification list. Polls every 20 s and after any
// page-visibility change (tab comes back into focus).

import { useState, useEffect, useCallback, useRef } from "react";
import { NotificationService } from "../modules/notifications/notifications.service";
import type { Notification } from "../modules/notifications/notifications.types";

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount:   number;
  loading:       boolean;
  refresh:       () => Promise<void>;
  markRead:      (id: number) => Promise<void>;
  markAllRead:   () => Promise<void>;
}

export function useNotifications(filter?: string): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const [list, count] = await Promise.all([
      NotificationService.list({ type: filter }),
      NotificationService.unreadCount(),
    ]);
    setNotifications(list);
    setUnreadCount(count);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void refresh();

    // Poll every 20 s
    timerRef.current = setInterval(() => void refresh(), 20_000);

    // Refresh when tab becomes visible again
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const markRead = useCallback(async (id: number) => {
    await NotificationService.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await NotificationService.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, loading, refresh, markRead, markAllRead };
}
