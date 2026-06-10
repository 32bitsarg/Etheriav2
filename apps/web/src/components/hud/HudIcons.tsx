// In-game HUD icons — same hand-crafted SVG style as landing/MedievalIcons.tsx,
// replaces the emoji glyphs in the sidebar/dock.

export function ChecklistIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="6" width="32" height="38" rx="4" fill="#fef3c7" stroke="#92400e" strokeWidth="2"/>
      <rect x="16" y="3" width="16" height="7" rx="2.5" fill="#d97706" stroke="#92400e" strokeWidth="1.5"/>
      <path d="M14 19l3 3 5-6M14 30l3 3 5-6" stroke="#15803d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M26 20h9M26 31h9" stroke="#a8a29e" strokeWidth="2.4" strokeLinecap="round"/>
    </svg>
  );
}

export function WonderIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4l16 9H8l16-9Z" fill="#fde68a" stroke="#92400e" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M10 38V17h4v21h-4Zm12 0V17h4v21h-4Zm12 0V17h4v21h-4Z" fill="#e7e5e4" stroke="#78716c" strokeWidth="1.6"/>
      <rect x="6" y="38" width="36" height="6" rx="1.5" fill="#d6d3d1" stroke="#78716c" strokeWidth="1.6"/>
      <circle cx="24" cy="9.5" r="1.8" fill="#d97706"/>
    </svg>
  );
}

export function LaurelsIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="20" r="11" fill="url(#laurel-medal)" stroke="#92400e" strokeWidth="2"/>
      <path d="M24 13l2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.3 4.7-.7L24 13Z" fill="#fef3c7" stroke="#d97706" strokeWidth="1"/>
      <path d="M18 30l-4 12 6-4 4 4V32M30 30l4 12-6-4" stroke="#b91c1c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
      <defs>
        <linearGradient id="laurel-medal" x1="13" y1="9" x2="35" y2="31">
          <stop offset="0%" stopColor="#fde68a"/>
          <stop offset="100%" stopColor="#f59e0b"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export function FeedIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 8h26v32a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4V8Z" fill="#fef9ef" stroke="#92400e" strokeWidth="2"/>
      <path d="M35 16h4v24a4 4 0 0 1-4 4" stroke="#92400e" strokeWidth="2"/>
      <path d="M14 15h16M14 22h16M14 29h10" stroke="#a8a29e" strokeWidth="2.4" strokeLinecap="round"/>
      <rect x="14" y="34" width="9" height="5" rx="1" fill="#fcd34d" stroke="#d97706" strokeWidth="1.2"/>
    </svg>
  );
}

export function GearIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 6l3 5.2 6-.9 1.2 5.9 5.9 1.2-.9 6L44 26l-4.8 3.6.9 6-5.9 1.2-1.2 5.9-6-.9L24 46l-3-4.2-6 .9-1.2-5.9-5.9-1.2.9-6L4 26l4.8-3.6-.9-6 5.9-1.2L15 9.3l6 .9L24 6Z" fill="url(#gear-grad)" stroke="#44403c" strokeWidth="2" strokeLinejoin="round" transform="translate(0,-2)"/>
      <circle cx="24" cy="24" r="7" fill="#fafaf9" stroke="#44403c" strokeWidth="2"/>
      <defs>
        <linearGradient id="gear-grad" x1="4" y1="6" x2="44" y2="46">
          <stop offset="0%" stopColor="#d6d3d1"/>
          <stop offset="100%" stopColor="#78716c"/>
        </linearGradient>
      </defs>
    </svg>
  );
}
