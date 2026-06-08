"use client";

import Image from "next/image";
import Link from "next/link";

const DISPLAY_FONT = "var(--font-fredoka, Fredoka, system-ui, sans-serif)";

export function CtaSection() {
  return (
    <section className="px-6 py-16" style={{ background: "#fdf7ee" }}>
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] shadow-[0_18px_40px_-16px_rgba(60,40,20,.28)]">
        <Image
          src="/assets/backgrounds/world-map.webp"
          fill
          className="object-cover"
          alt=""
          quality={75}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(120deg,rgba(44,33,24,.85),rgba(44,33,24,.55))" }}
        />
        <div className="relative px-8 py-16 text-center sm:py-20">
          <Image
            src="/assets/landing/conquest-of-etheria/logo-conquest-of-etheria.webp"
            width={160}
            height={80}
            className="mx-auto h-20 w-auto drop-shadow-xl"
            alt=""
            quality={82}
          />
          <h2 className="mt-5 text-4xl font-bold text-white sm:text-5xl" style={{ fontFamily: DISPLAY_FONT }}>
            El mundo de Etheria te espera
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[16px] text-white/85">
            Miles de jugadores ya están construyendo su imperio. Sumate hoy, es gratis.
          </p>
          <Link
            href="/registro"
            className="mt-8 inline-block rounded-full bg-amber-500 px-9 py-4 text-[17px] font-semibold text-white shadow-[0_14px_30px_-8px_rgba(245,158,11,.8)] transition-transform hover:-translate-y-0.5 hover:bg-amber-600"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            Jugar gratis ahora
          </Link>
        </div>
      </div>
    </section>
  );
}
