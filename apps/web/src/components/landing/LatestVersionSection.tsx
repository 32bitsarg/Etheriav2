"use client";

import Image from "next/image";
import Link from "next/link";
import { HammerIcon } from "./MedievalIcons";

const DISPLAY_FONT = "var(--font-fredoka, Fredoka, system-ui, sans-serif)";

export function LatestVersionSection() {
  return (
    <section id="mundo" className="relative px-6 py-20" style={{ background: "#fdf7ee" }}>
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
        {/* Image column */}
        <div className="relative order-2 lg:order-1">
          <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-amber-100 to-[#f6ebdb]" />
          <div className="relative overflow-hidden rounded-[2rem] border-4 border-white shadow-[0_18px_40px_-16px_rgba(60,40,20,.28)]">
            <Image
              src="/assets/backgrounds/village-fullscreen.webp"
              width={720}
              height={480}
              className="h-full w-full object-cover"
              alt="Tu aldea"
              quality={82}
            />
          </div>
          <div className="absolute -bottom-5 left-6 flex items-center gap-2.5 rounded-2xl border border-[#f6ebdb] bg-white px-4 py-2.5 shadow-[0_10px_26px_-14px_rgba(60,40,20,.3)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100"><HammerIcon className="h-5 w-5" /></span>
            <div>
              <div className="text-[13px] font-bold text-[#2c2118]">Mejorando…</div>
              <div className="text-[11px] text-[#6f6052]">Ayuntamiento → Nv 13</div>
            </div>
          </div>
        </div>

        {/* Text column */}
        <div className="order-1 lg:order-2">
          <span className="inline-block rounded-full bg-teal-100 px-3.5 py-1 text-[13px] font-semibold text-teal-700" style={{ fontFamily: DISPLAY_FONT }}>
            Empezá tranquilo
          </span>
          <h2 className="mt-4 text-4xl font-bold leading-tight text-[#2c2118] sm:text-5xl" style={{ fontFamily: DISPLAY_FONT }}>
            Una aldea que se siente tuya
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[#6f6052]">
            Cada edificio tiene su lugar y su propósito. Subí de nivel tu granja, tu mina y tu cuartel a tu ritmo —con protección de novato para que nadie te apure mientras aprendés.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "12 edificios con mejoras y producción pasiva",
              "Recursos que crecen incluso si te desconectás",
              "Colas claras: construí, entrená e investigá",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-[15px] font-medium text-[#2c2118]">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-600">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/registro"
            className="mt-7 inline-block rounded-full bg-[#2c2118] px-7 py-3 text-[15px] font-semibold text-[#fdf7ee] transition-transform hover:-translate-y-0.5"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            Ver mi aldea →
          </Link>
        </div>
      </div>
    </section>
  );
}
