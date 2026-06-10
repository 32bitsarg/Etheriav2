"use client";

import { useEffect, useState } from "react";

export function OrientationLock() {
  const [showRotate, setShowRotate] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Lock to landscape via Screen Orientation API
    const lockLandscape = async () => {
      try {
        if ("orientation" in screen && "lock" in screen.orientation) {
          await (screen.orientation as any).lock("landscape");
        }
      } catch {
        // API not supported or denied — show rotate prompt instead
      }
    };
    lockLandscape();

    // Show rotate prompt fallback
    const checkOrientation = () => {
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      setShowRotate(isPortrait);
    };
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    const mq = window.matchMedia("(orientation: portrait)");
    mq.addEventListener("change", checkOrientation);

    // Unlock on unmount
    return () => {
      window.removeEventListener("resize", checkOrientation);
      mq.removeEventListener("change", checkOrientation);
      try {
        if ("orientation" in screen && "unlock" in screen.orientation) {
          (screen.orientation as any).unlock();
        }
      } catch {}
    };
  }, []);

  if (!showRotate) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 text-white">
      <span className="mb-6 text-6xl animate-pulse">📱↻</span>
      <p className="text-xl font-bold tracking-wide text-center px-8">
        Girá tu dispositivo
      </p>
      <p className="mt-2 text-sm text-white/60 text-center px-8">
        Etheria se juega en horizontal
      </p>
    </div>
  );
}
