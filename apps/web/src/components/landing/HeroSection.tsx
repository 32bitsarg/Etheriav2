"use client";

import Link from "next/link";

export function HeroSection() {
  return (
    <header className="relative flex min-h-screen items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="/assets/landing/conquest-of-etheria/hero-conquest-of-etheria.png"
          className="h-full w-full object-cover"
          alt=""
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg,rgba(253,247,238,.15) 0%,rgba(44,33,24,.12) 40%,rgba(44,33,24,.66) 100%)" }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-40"
          style={{ background: "linear-gradient(180deg,transparent,#fdf7ee)" }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-24 pt-28 text-center">
        <img
          src="/assets/landing/conquest-of-etheria/logo-conquest-of-etheria.png"
          className="animate-floaty mx-auto h-32 w-auto drop-shadow-2xl sm:h-40"
          alt="Conquest of Etheria"
        />

        <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 backdrop-blur-md">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          <span className="text-[12px] font-semibold uppercase tracking-[.14em] text-white">
            Estrategia para todos · Gratis
          </span>
        </div>

        <h1
          className="mx-auto mt-5 max-w-3xl text-5xl font-bold leading-[1.05] text-white drop-shadow-lg sm:text-6xl md:text-7xl"
          style={{ fontFamily: "var(--font-fredoka, Fredoka, system-ui, sans-serif)" }}
        >
          Tu reino. Tu historia.<br />Tu conquista.
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-white/90 drop-shadow sm:text-lg">
          Construí tu aldea, hacé crecer tu economía y aliáte con amigos para dominar un mundo vivo. Fácil de empezar, difícil de soltar.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/registro"
            className="rounded-full bg-amber-500 px-8 py-3.5 text-[17px] font-semibold text-white shadow-[0_14px_30px_-8px_rgba(245,158,11,.8)] transition-transform hover:-translate-y-0.5 hover:bg-amber-600"
            style={{ fontFamily: "var(--font-fredoka, Fredoka, system-ui, sans-serif)" }}
          >
            Empezar a jugar
          </Link>
          <a
            href="#mundo"
            className="rounded-full border border-white/40 bg-white/10 px-7 py-3.5 text-[16px] font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
          >
            Explorar el mundo
          </a>
        </div>

        <p className="mt-4 text-[13px] font-medium text-white/70">
          Sin descargas · Jugá en el navegador · Tu aldea se crea sola
        </p>

        {/* Stats */}
        <div className="mx-auto mt-12 flex max-w-lg items-center justify-center gap-3 sm:gap-5">
          {[
            { value: "50K+", label: "Jugadores" },
            { value: "12K+", label: "Batallas/día" },
            { value: "4", label: "Temporadas" },
          ].map((s) => (
            <div key={s.label} className="flex-1 rounded-2xl border border-white/25 bg-white/12 px-4 py-3 backdrop-blur-md">
              <div
                className="text-2xl font-bold text-white"
                style={{ fontFamily: "var(--font-fredoka, Fredoka, system-ui, sans-serif)" }}
              >
                {s.value}
              </div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-white/70">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
