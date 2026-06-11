"use client";

import { useEffect, useState } from "react";

// Un teléfono apaisado mide >=768px de ancho pero sigue siendo un teléfono:
// lo detectamos por puntero táctil + pantalla baja.
const MOBILE_QUERY = "(max-width: 767px), ((pointer: coarse) and (max-height: 500px))";

// Single source of truth for the mobile/desktop HUD split. Returns null until
// mounted so SSR markup doesn't commit to either layout.
export function useIsMobile(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isMobile;
}
