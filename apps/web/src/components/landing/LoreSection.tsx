"use client";

const DISPLAY_FONT = "var(--font-fredoka, Fredoka, system-ui, sans-serif)";

const FACTIONS = [
  {
    emoji: "☀️",
    gradient: "linear-gradient(135deg,#fde68a,#f59e0b)",
    name: "Aurelion",
    subtitle: "Guardianes de la luz",
    subtitleColor: "text-amber-600",
    desc: "Maestros de la economía dorada y las defensas resplandecientes. Prosperan en la abundancia.",
  },
  {
    emoji: "🌑",
    gradient: "linear-gradient(135deg,#c4b5fd,#7c3aed)",
    name: "Shadowmere",
    subtitle: "Maestros de la intriga",
    subtitleColor: "text-purple-600",
    desc: "Espías, emboscadas y diplomacia astuta. Golpean cuando menos lo esperás.",
  },
  {
    emoji: "❄️",
    gradient: "linear-gradient(135deg,#bae6fd,#0ea5e9)",
    name: "Frostborne",
    subtitle: "Guerreros del norte",
    subtitleColor: "text-sky-600",
    desc: "Resisten los inviernos más duros y cargan con caballería implacable. Hierro y hielo.",
  },
];

export function LoreSection() {
  return (
    <section id="facciones" className="px-6 py-16" style={{ background: "#fdf7ee" }}>
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-block rounded-full bg-purple-100 px-3.5 py-1 text-[13px] font-semibold text-purple-700" style={{ fontFamily: DISPLAY_FONT }}>
            El lore
          </span>
          <h2 className="mt-4 text-4xl font-bold text-[#2c2118] sm:text-5xl" style={{ fontFamily: DISPLAY_FONT }}>
            Elegí tu bando
          </h2>
          <p className="mt-3 text-[16px] text-[#6f6052]">
            Tres facciones dominan Etheria. ¿A quién vas a jurar lealtad?
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {FACTIONS.map((f) => (
            <div key={f.name} className="overflow-hidden rounded-[1.8rem] border border-[#f6ebdb] bg-white shadow-[0_10px_26px_-14px_rgba(60,40,20,.3)]">
              <div className="flex h-28 items-center justify-center" style={{ background: f.gradient }}>
                <span className="text-5xl drop-shadow">{f.emoji}</span>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-semibold text-[#2c2118]" style={{ fontFamily: DISPLAY_FONT }}>{f.name}</h3>
                <p className={`mt-1 text-[13px] font-semibold uppercase tracking-wide ${f.subtitleColor}`}>{f.subtitle}</p>
                <p className="mt-3 text-[14.5px] leading-relaxed text-[#6f6052]">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
