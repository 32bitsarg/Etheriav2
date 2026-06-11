"use client";

import { useState, useEffect, useCallback } from "react";

// ── Singleton tick bus ─────────────────────────────────────────────────────────
// One setInterval for all useCountdown instances — fires every second and
// notifies all subscribers together so React 18 can batch the state updates.
const _listeners = new Set<() => void>();
let _tickId: ReturnType<typeof setInterval> | null = null;

function _subscribe(cb: () => void) {
  _listeners.add(cb);
  if (!_tickId) {
    _tickId = setInterval(() => {
      _listeners.forEach((fn) => fn());
    }, 1000);
  }
  return () => {
    _listeners.delete(cb);
    if (_listeners.size === 0 && _tickId !== null) {
      clearInterval(_tickId);
      _tickId = null;
    }
  };
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useCountdown(targetDate: Date | string | null, onComplete?: () => void) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => _subscribe(() => setNow(Date.now())), []);

  const remaining = useCallback(() => {
    if (!targetDate) return null;
    const target = typeof targetDate === "string" ? new Date(targetDate).getTime() : targetDate.getTime();
    const diff = Math.max(0, target - now);
    return Math.ceil(diff / 1000);
  }, [targetDate, now]);

  const progress = useCallback((startDate: Date | string) => {
    if (!targetDate) return 0;
    const start = typeof startDate === "string" ? new Date(startDate).getTime() : startDate.getTime();
    const target = typeof targetDate === "string" ? new Date(targetDate).getTime() : targetDate.getTime();
    const total = target - start;
    if (total <= 0) return 100;
    return Math.min(100, Math.max(0, ((now - start) / total) * 100));
  }, [targetDate, now]);

  useEffect(() => {
    if (targetDate) {
      const target = typeof targetDate === "string" ? new Date(targetDate).getTime() : targetDate.getTime();
      if (target <= now && onComplete) {
        onComplete();
      }
    }
  }, [now, targetDate, onComplete]);

  return { remaining, progress, isComplete: (remaining() ?? 0) === 0 };
}
