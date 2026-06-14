"use client";

import { useState, useEffect } from "react";

export type ViewportTier = "xs" | "sm" | "md";

/** Sub-breakpoints within the mobile range (<768px).
 *  xs: < 360px  (small phones — icons only, no labels)
 *  sm: 360–413px (standard phones — short labels)
 *  md: 414px+   (large phones / phablets — full labels)
 *  SSR-safe: returns "sm" until mounted.
 */
export function useViewportTier(): ViewportTier {
  const [tier, setTier] = useState<ViewportTier>("sm");

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setTier(w < 360 ? "xs" : w < 414 ? "sm" : "md");
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return tier;
}
