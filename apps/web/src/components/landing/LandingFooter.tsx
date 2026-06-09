"use client";

import Link from "next/link";

const DISPLAY_FONT = "var(--font-fredoka, Fredoka, system-ui, sans-serif)";

export function LandingFooter() {
  return (
    <footer className="border-t border-[#f6ebdb] px-6 py-12" style={{ background: "#fdf7ee" }}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-3">
          <img src="/assets/landing/conquest-of-etheria/logo-conquest-of-etheria.png" className="h-11 w-auto" alt="" />
          <div>
            <div className="text-[16px] font-semibold text-[#2c2118]" style={{ fontFamily: DISPLAY_FONT }}>Etheria</div>
            <div className="text-[12px] text-[#6f6052]">Conquista. Construye. Domina.</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2">
          <Link href="/changelog" className="text-[14px] font-medium text-[#6f6052] hover:text-[#2c2118]">Novedades</Link>
          <a href="#facciones" className="text-[14px] font-medium text-[#6f6052] hover:text-[#2c2118]">Facciones</a>
          <Link href="/login" className="text-[14px] font-medium text-[#6f6052] hover:text-[#2c2118]">Entrar</Link>
          <Link href="/registro" className="text-[14px] font-medium text-[#6f6052] hover:text-[#2c2118]">Registrarse</Link>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-6xl border-t border-[#f6ebdb] pt-6 text-center text-[12px] text-[#6f6052]">
        © 2026 Etheria · Desarrollado con 💛 por el Equipo Etheria · Powered by <a href="https://matecito.dev" target="_blank" rel="noopener" className="underline hover:text-[#2c2118]">matecito.dev</a>
      </div>
    </footer>
  );
}
