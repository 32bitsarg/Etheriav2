"use client";

const DISPLAY_FONT = "var(--font-fredoka, Fredoka, system-ui, sans-serif)";

const FEATURES = [
  { icon: "⚔️", bg: "bg-amber-100", title: "Combate con sentido", desc: "Cada unidad cuenta. Combiná guerreros, arqueros y caballería y usá el terreno a tu favor." },
  { icon: "🌍", bg: "bg-teal-100", title: "Un mundo vivo", desc: "Ejércitos y caravanas se mueven en tiempo real. El mapa cambia con cada jugador." },
  { icon: "🤝", bg: "bg-sky-100", title: "Mejor con amigos", desc: "Sumate a una alianza, chateá, firmá tratados y defendé el territorio en equipo." },
  { icon: "📚", bg: "bg-purple-100", title: "Investigá y crecé", desc: "22 tecnologías en tres ramas para darle tu propio estilo a tu imperio." },
  { icon: "❄️", bg: "bg-rose-100", title: "Estaciones que importan", desc: "El invierno aprieta, el verano produce. Adaptá tu estrategia a cada temporada." },
  { icon: "🏆", bg: null, title: "Temporadas y rankings", desc: "Competí por el primer puesto y ganá recompensas exclusivas cada temporada.", highlight: true },
];

export function FeaturesSection() {
  return (
    <section className="px-6 py-16" style={{ background: "#fdf7ee" }}>
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-block rounded-full bg-amber-100 px-3.5 py-1 text-[13px] font-semibold text-amber-700" style={{ fontFamily: DISPLAY_FONT }}>
            Por qué te va a gustar
          </span>
          <h2 className="mt-4 text-4xl font-bold text-[#2c2118] sm:text-5xl" style={{ fontFamily: DISPLAY_FONT }}>
            Profundo, pero amigable
          </h2>
          <p className="mt-3 text-[16px] text-[#6f6052]">
            Toda la estrategia que querés, presentada de forma clara y sin complicaciones.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`rounded-[1.6rem] border p-7 transition-transform hover:-translate-y-1 shadow-[0_10px_26px_-14px_rgba(60,40,20,.3)] ${
                f.highlight
                  ? "border-amber-400 bg-gradient-to-br from-amber-400 to-amber-500 text-white"
                  : "border-[#f6ebdb] bg-white"
              }`}
            >
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-[26px] ${f.highlight ? "bg-white/20" : f.bg}`}>
                {f.icon}
              </div>
              <h3
                className={`mt-5 text-xl font-semibold ${f.highlight ? "text-white" : "text-[#2c2118]"}`}
                style={{ fontFamily: DISPLAY_FONT }}
              >
                {f.title}
              </h3>
              <p className={`mt-2 text-[14.5px] leading-relaxed ${f.highlight ? "text-white/90" : "text-[#6f6052]"}`}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
