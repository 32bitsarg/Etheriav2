"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";

export function LandingNavbar() {
  const router = useRouter();
  const auth = useMatecitoAuth();

  if (auth.ready && auth.isLoggedIn) {
    return (
      <nav className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto mt-3 flex max-w-6xl items-center justify-between rounded-full border border-[#f6ebdb] bg-[#fdf7ee]/90 px-3 py-2 pl-4 shadow-[0_10px_26px_-14px_rgba(60,40,20,.3)] backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/assets/landing/conquest-of-etheria/logo-conquest-of-etheria.png" alt="Etheria" className="h-9 w-auto" />
            <span className="text-lg font-semibold tracking-tight text-[#2c2118]" style={{ fontFamily: "var(--font-fredoka, Fredoka, system-ui, sans-serif)" }}>Etheria</span>
          </Link>
          <button
            onClick={() => router.replace("/play")}
            className="rounded-full bg-amber-500 px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_18px_-6px_rgba(245,158,11,.7)] transition-transform hover:-translate-y-0.5 hover:bg-amber-600"
          >
            Ir a jugar →
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto mt-3 flex max-w-6xl items-center justify-between rounded-full border border-[#f6ebdb] bg-[#fdf7ee]/90 px-3 py-2 pl-4 shadow-[0_10px_26px_-14px_rgba(60,40,20,.3)] backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/assets/landing/conquest-of-etheria/logo-conquest-of-etheria.png" alt="Etheria" className="h-9 w-auto" />
          <span className="text-lg font-semibold tracking-tight text-[#2c2118]" style={{ fontFamily: "var(--font-fredoka, Fredoka, system-ui, sans-serif)" }}>Etheria</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          <Link href="/#mundo" className="text-[14px] font-medium text-[#6f6052] transition-colors hover:text-[#2c2118]">El mundo</Link>
          <Link href="/#como" className="text-[14px] font-medium text-[#6f6052] transition-colors hover:text-[#2c2118]">Cómo se juega</Link>
          <Link href="/#facciones" className="text-[14px] font-medium text-[#6f6052] transition-colors hover:text-[#2c2118]">Facciones</Link>
          <Link href="/changelog" className="text-[14px] font-medium text-[#6f6052] transition-colors hover:text-[#2c2118]">Novedades</Link>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-full px-4 py-2 text-[14px] font-semibold text-[#2c2118] transition-colors hover:bg-[#f6ebdb] sm:block">
            Entrar
          </Link>
          <Link href="/registro" className="rounded-full bg-amber-500 px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_18px_-6px_rgba(245,158,11,.7)] transition-transform hover:-translate-y-0.5 hover:bg-amber-600">
            Jugar gratis
          </Link>
        </div>
      </div>
    </nav>
  );
}
