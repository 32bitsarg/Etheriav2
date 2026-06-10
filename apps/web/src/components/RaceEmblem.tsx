// Crest-style emblems per race — replaces emoji icons across landing and selectors.
// Same hand-crafted SVG approach as landing/MedievalIcons.tsx.

export type RaceEmblemId = "HUMAN" | "ELF" | "ORC" | "DWARF";

function HumanEmblem({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 4L54 12V30c0 14-9.5 23.5-22 28C19.5 53.5 10 44 10 30V12L32 4Z" fill="url(#human-shield)" stroke="#92400e" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M32 8L50 14.5V29.5c0 11.5-7.8 19.6-18 23.6-10.2-4-18-12.1-18-23.6V14.5L32 8Z" fill="#1c1410" opacity="0.25"/>
      <path d="M18 36V25l6 5 8-11 8 11 6-5v11H18Z" fill="url(#human-crown)" stroke="#92400e" strokeWidth="1.5" strokeLinejoin="round"/>
      <rect x="18" y="36" width="28" height="5" rx="1.5" fill="#f5a623" stroke="#92400e" strokeWidth="1.5"/>
      <circle cx="24" cy="38.5" r="1.4" fill="#7f1d1d"/>
      <circle cx="32" cy="38.5" r="1.4" fill="#14532d"/>
      <circle cx="40" cy="38.5" r="1.4" fill="#1e3a8a"/>
      <circle cx="32" cy="22" r="2" fill="#fef3c7" stroke="#d97706" strokeWidth="1"/>
      <defs>
        <linearGradient id="human-shield" x1="10" y1="4" x2="54" y2="58">
          <stop offset="0%" stopColor="#fde68a"/>
          <stop offset="100%" stopColor="#b45309"/>
        </linearGradient>
        <linearGradient id="human-crown" x1="18" y1="19" x2="46" y2="41">
          <stop offset="0%" stopColor="#fef3c7"/>
          <stop offset="100%" stopColor="#f5a623"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function ElfEmblem({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 4L54 12V30c0 14-9.5 23.5-22 28C19.5 53.5 10 44 10 30V12L32 4Z" fill="url(#elf-shield)" stroke="#14532d" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M32 8L50 14.5V29.5c0 11.5-7.8 19.6-18 23.6-10.2-4-18-12.1-18-23.6V14.5L32 8Z" fill="#06140a" opacity="0.3"/>
      <path d="M22 18c0 14 4 20 10 26 6-6 10-12 10-26-4 3-7 4-10 4s-6-1-10-4Z" fill="url(#elf-leaf)" stroke="#14532d" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M32 22v20" stroke="#14532d" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M32 28l-5-3M32 32l6-3.5M32 37l-5.5-3" stroke="#14532d" strokeWidth="1.2" strokeLinecap="round"/>
      <defs>
        <linearGradient id="elf-shield" x1="10" y1="4" x2="54" y2="58">
          <stop offset="0%" stopColor="#a8e6cf"/>
          <stop offset="100%" stopColor="#15803d"/>
        </linearGradient>
        <linearGradient id="elf-leaf" x1="22" y1="18" x2="42" y2="44">
          <stop offset="0%" stopColor="#d9f99d"/>
          <stop offset="100%" stopColor="#4cd964"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function OrcEmblem({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 4L54 12V30c0 14-9.5 23.5-22 28C19.5 53.5 10 44 10 30V12L32 4Z" fill="url(#orc-shield)" stroke="#7f1d1d" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M32 8L50 14.5V29.5c0 11.5-7.8 19.6-18 23.6-10.2-4-18-12.1-18-23.6V14.5L32 8Z" fill="#180808" opacity="0.32"/>
      <path d="M22 20c-2 6-1 12 2 16l3 3v5l5 2 5-2v-5l3-3c3-4 4-10 2-16-3-2-7-3-10-3s-7 1-10 3Z" fill="url(#orc-skull)" stroke="#7f1d1d" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M25 41l-3 6M39 41l3 6" stroke="#fca5a5" strokeWidth="2.2" strokeLinecap="round"/>
      <ellipse cx="27" cy="29" rx="2.6" ry="3.2" fill="#450a0a"/>
      <ellipse cx="37" cy="29" rx="2.6" ry="3.2" fill="#450a0a"/>
      <path d="M30 36h4l-2 3-2-3Z" fill="#450a0a"/>
      <defs>
        <linearGradient id="orc-shield" x1="10" y1="4" x2="54" y2="58">
          <stop offset="0%" stopColor="#fca5a5"/>
          <stop offset="100%" stopColor="#991b1b"/>
        </linearGradient>
        <linearGradient id="orc-skull" x1="22" y1="17" x2="42" y2="46">
          <stop offset="0%" stopColor="#fef2f2"/>
          <stop offset="100%" stopColor="#d6d3d1"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function DwarfEmblem({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 4L54 12V30c0 14-9.5 23.5-22 28C19.5 53.5 10 44 10 30V12L32 4Z" fill="url(#dwarf-shield)" stroke="#1e3a8a" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M32 8L50 14.5V29.5c0 11.5-7.8 19.6-18 23.6-10.2-4-18-12.1-18-23.6V14.5L32 8Z" fill="#060b18" opacity="0.3"/>
      <rect x="20" y="17" width="24" height="10" rx="2.5" fill="url(#dwarf-hammer)" stroke="#1e3a8a" strokeWidth="1.5"/>
      <rect x="29.5" y="27" width="5" height="17" rx="1.5" fill="#92400e" stroke="#451a03" strokeWidth="1.2"/>
      <path d="M22 47h20l-3-5H25l-3 5Z" fill="#94a3b8" stroke="#1e3a8a" strokeWidth="1.3" strokeLinejoin="round"/>
      <circle cx="32" cy="22" r="1.6" fill="#1e3a8a"/>
      <defs>
        <linearGradient id="dwarf-shield" x1="10" y1="4" x2="54" y2="58">
          <stop offset="0%" stopColor="#bfdbfe"/>
          <stop offset="100%" stopColor="#1d4ed8"/>
        </linearGradient>
        <linearGradient id="dwarf-hammer" x1="20" y1="17" x2="44" y2="27">
          <stop offset="0%" stopColor="#e2e8f0"/>
          <stop offset="100%" stopColor="#94a3b8"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

const EMBLEMS: Record<RaceEmblemId, (p: { className?: string }) => React.JSX.Element> = {
  HUMAN: HumanEmblem,
  ELF: ElfEmblem,
  ORC: OrcEmblem,
  DWARF: DwarfEmblem,
};

export function RaceEmblem({ race, className = "h-12 w-12" }: { race: string; className?: string }) {
  const Emblem = EMBLEMS[race.toUpperCase() as RaceEmblemId];
  if (!Emblem) return null;
  return <Emblem className={className} />;
}
