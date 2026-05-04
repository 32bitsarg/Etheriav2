"use client";

import Link from "next/link";
import { landingContent } from "@/config/landingContent";

export function LandingNavbar() {
  const { gameName } = landingContent;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-stone-800 bg-[#0c0a09]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold text-white tracking-wide">
          {gameName}
        </Link>
        <div className="flex items-center gap-8">
          <Link href="/changelog" className="text-sm font-medium text-stone-400 hover:text-amber-400 transition-colors">
            Changelog
          </Link>
          <Link href="/login" className="text-sm font-medium text-stone-400 hover:text-amber-400 transition-colors">
            Iniciar Sesión
          </Link>
          <Link
            href="/registro"
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 transition-colors"
          >
            Jugar Ahora
          </Link>
        </div>
      </div>
    </nav>
  );
}
