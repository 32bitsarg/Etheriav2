"use client";

import Link from "next/link";

const DISPLAY_FONT = "var(--font-fredoka, Fredoka, system-ui, sans-serif)";

const STEPS = [
  { num: "1", color: "bg-amber-500", title: "Creá tu cuenta", desc: "Registro gratis en segundos. Tu aldea aparece en una isla con espacio." },
  { num: "2", color: "bg-teal-500", title: "Construí tu base", desc: "Recolectá recursos, mejorá edificios y entrená tus primeras tropas." },
  { num: "3", color: "bg-purple-500", title: "Conquistá el mundo", desc: "Aliáte, explorá el mapa y escalá en el ranking de temporada." },
];

export function HowToPlaySection() {
  return (
    <section id="como" className="px-6 py-16" style={{ background: "#fdf7ee" }}>
      <div className="mx-auto max-w-5xl rounded-[2.5rem] border border-[#f6ebdb] px-6 py-14 sm:px-12" style={{ background: "rgba(246,235,219,.5)" }}>
        <div className="mb-12 text-center">
          <span className="inline-block rounded-full bg-white px-3.5 py-1 text-[13px] font-semibold text-[#2c2118]" style={{ fontFamily: DISPLAY_FONT }}>
            En 3 pasos
          </span>
          <h2 className="mt-4 text-4xl font-bold text-[#2c2118] sm:text-5xl" style={{ fontFamily: DISPLAY_FONT }}>
            Empezás en un minuto
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.num} className="text-center">
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${s.color} text-2xl font-bold text-white shadow-[0_18px_40px_-16px_rgba(60,40,20,.28)]`}
                style={{ fontFamily: DISPLAY_FONT }}
              >
                {s.num}
              </div>
              <h3 className="mt-5 text-xl font-semibold text-[#2c2118]" style={{ fontFamily: DISPLAY_FONT }}>{s.title}</h3>
              <p className="mt-2 text-[14.5px] text-[#6f6052]">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/registro"
            className="rounded-full bg-amber-500 px-8 py-3.5 text-[16px] font-semibold text-white shadow-[0_14px_30px_-8px_rgba(245,158,11,.8)] transition-transform hover:-translate-y-0.5 hover:bg-amber-600"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            Crear mi cuenta gratis
          </Link>
        </div>
      </div>
    </section>
  );
}
