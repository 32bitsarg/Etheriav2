"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AudioEngine } from "@/lib/AudioEngine";
import { useAudioStore } from "@/stores/audioStore";

const MUSIC_ROUTES = ["/", "/login", "/registro", "/changelog", "/play", "/mapa"];

export function MusicController() {
  const pathname = usePathname();
  const lastViewKey = useAudioStore((s) => s.lastViewKey);
  const isUnlocked = useAudioStore((s) => s.isUnlocked);
  const prevKeyRef = useRef<string>("");

  useEffect(() => {
    const isMusicRoute = MUSIC_ROUTES.some(
      (r) => pathname === r || (r !== "/" && pathname.startsWith(r))
    );
    if (!isMusicRoute) {
      AudioEngine.stop();
      prevKeyRef.current = "";
      return;
    }

    const compositeKey = `${pathname}|${lastViewKey}`;
    if (compositeKey !== prevKeyRef.current) {
      prevKeyRef.current = compositeKey;
      AudioEngine.playScene();
    }
  }, [pathname, lastViewKey]);

  return null;
}
