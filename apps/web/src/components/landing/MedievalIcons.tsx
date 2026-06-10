export function SwordIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M38 6L30 14L34 18L42 10L38 6Z" fill="#d97706" stroke="#92400e" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M28 16L12 32L16 36L32 20L28 16Z" fill="url(#blade-grad)" stroke="#78716c" strokeWidth="1"/>
      <path d="M14 34L10 38L12 40L16 36L14 34Z" fill="#78350f" stroke="#451a03" strokeWidth="1"/>
      <path d="M16 36L8 44L10 46L18 38L16 36Z" fill="#92400e" stroke="#451a03" strokeWidth="1"/>
      <circle cx="36" cy="8" r="2" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5"/>
      <defs>
        <linearGradient id="blade-grad" x1="12" y1="32" x2="32" y2="12">
          <stop offset="0%" stopColor="#e7e5e4"/>
          <stop offset="50%" stopColor="#f5f5f4"/>
          <stop offset="100%" stopColor="#d6d3d1"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export function CastleIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="20" width="36" height="24" fill="#e7e5e4" stroke="#78716c" strokeWidth="1.5"/>
      <rect x="4" y="12" width="8" height="12" fill="#d6d3d1" stroke="#78716c" strokeWidth="1.5"/>
      <rect x="18" y="12" width="8" height="12" fill="#d6d3d1" stroke="#78716c" strokeWidth="1.5"/>
      <rect x="32" y="12" width="8" height="12" fill="#d6d3d1" stroke="#78716c" strokeWidth="1.5"/>
      <rect x="5" y="8" width="6" height="6" fill="#d97706" stroke="#92400e" strokeWidth="1"/>
      <rect x="19" y="8" width="6" height="6" fill="#d97706" stroke="#92400e" strokeWidth="1"/>
      <rect x="33" y="8" width="6" height="6" fill="#d97706" stroke="#92400e" strokeWidth="1"/>
      <path d="M18 44V34H30V44" fill="#78350f" stroke="#451a03" strokeWidth="1"/>
      <path d="M22 34V28H26V34" fill="#451a03"/>
      <rect x="10" y="26" width="4" height="4" fill="#93c5fd" stroke="#3b82f6" strokeWidth="0.5"/>
      <rect x="34" y="26" width="4" height="4" fill="#93c5fd" stroke="#3b82f6" strokeWidth="0.5"/>
    </svg>
  );
}

export function GlobeIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="18" fill="#93c5fd" stroke="#2563eb" strokeWidth="2"/>
      <ellipse cx="24" cy="24" rx="8" ry="18" fill="none" stroke="#2563eb" strokeWidth="1.5"/>
      <path d="M6 24H42" stroke="#2563eb" strokeWidth="1.5"/>
      <path d="M8 16H40" stroke="#2563eb" strokeWidth="1" opacity="0.5"/>
      <path d="M8 32H40" stroke="#2563eb" strokeWidth="1" opacity="0.5"/>
      <path d="M12 10C16 14 32 14 36 10" fill="#4ade80" stroke="#16a34a" strokeWidth="1" opacity="0.7"/>
      <path d="M14 34C18 38 30 38 34 34" fill="#4ade80" stroke="#16a34a" strokeWidth="1" opacity="0.7"/>
    </svg>
  );
}

export function ShieldIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4L8 12V24C8 34 15 42 24 44C33 42 40 34 40 24V12L24 4Z" fill="url(#shield-grad)" stroke="#92400e" strokeWidth="2"/>
      <path d="M24 8L12 14V24C12 32 17 38 24 40C31 38 36 32 36 24V14L24 8Z" fill="none" stroke="#d97706" strokeWidth="1"/>
      <path d="M24 16L20 24H28L24 32" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <defs>
        <linearGradient id="shield-grad" x1="8" y1="4" x2="40" y2="44">
          <stop offset="0%" stopColor="#fef3c7"/>
          <stop offset="100%" stopColor="#fde68a"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ScrollIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 6H32C34.2 6 36 7.8 36 10V38C36 40.2 34.2 42 32 42H16C13.8 42 12 40.2 12 38V6Z" fill="#fef3c7" stroke="#92400e" strokeWidth="1.5"/>
      <path d="M12 6C12 3.8 13.8 2 16 2H32C34.2 2 36 3.8 36 6" fill="#fde68a" stroke="#92400e" strokeWidth="1.5"/>
      <path d="M12 38C12 40.2 13.8 42 16 42H20C17.8 42 16 40.2 16 38V6C16 3.8 17.8 2 20 2H16C13.8 2 12 3.8 12 6V38Z" fill="#fde68a" stroke="#92400e" strokeWidth="1"/>
      <line x1="18" y1="14" x2="30" y2="14" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="18" y1="20" x2="30" y2="20" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="18" y1="26" x2="26" y2="26" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function CrownIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 36L10 14L18 24L24 8L30 24L38 14L42 36H6Z" fill="url(#crown-grad)" stroke="#92400e" strokeWidth="2" strokeLinejoin="round"/>
      <rect x="6" y="36" width="36" height="6" rx="1" fill="#d97706" stroke="#92400e" strokeWidth="1.5"/>
      <circle cx="10" cy="14" r="2" fill="#ef4444" stroke="#991b1b" strokeWidth="0.5"/>
      <circle cx="24" cy="8" r="2" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="0.5"/>
      <circle cx="38" cy="14" r="2" fill="#22c55e" stroke="#15803d" strokeWidth="0.5"/>
      <defs>
        <linearGradient id="crown-grad" x1="6" y1="8" x2="42" y2="36">
          <stop offset="0%" stopColor="#fbbf24"/>
          <stop offset="50%" stopColor="#f59e0b"/>
          <stop offset="100%" stopColor="#d97706"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export function UsersIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="14" r="6" fill="#d6d3d1" stroke="#78716c" strokeWidth="1.5"/>
      <path d="M6 38C6 30 11 26 18 26C25 26 30 30 30 38" fill="#e7e5e4" stroke="#78716c" strokeWidth="1.5"/>
      <circle cx="34" cy="16" r="5" fill="#d6d3d1" stroke="#78716c" strokeWidth="1.5"/>
      <path d="M30 38C30 32 32 28 34 28C36 28 38 32 38 38" fill="#e7e5e4" stroke="#78716c" strokeWidth="1.5"/>
      <circle cx="18" cy="14" r="3" fill="#d97706" opacity="0.3"/>
    </svg>
  );
}

export function MapIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 10L16 6L32 12L44 8V38L32 42L16 36L4 40V10Z" fill="#fef3c7" stroke="#92400e" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M16 6V36" stroke="#92400e" strokeWidth="1.5"/>
      <path d="M32 12V42" stroke="#92400e" strokeWidth="1.5"/>
      <path d="M10 18L14 16L18 20L22 14" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="26" cy="28" r="3" fill="#ef4444" stroke="#991b1b" strokeWidth="1"/>
      <path d="M26 25V22" stroke="#991b1b" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function FlameIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4C24 4 10 20 10 30C10 38 16 44 24 44C32 44 38 38 38 30C38 20 24 4 24 4Z" fill="url(#flame-grad)" stroke="#dc2626" strokeWidth="1.5"/>
      <path d="M24 20C24 20 18 28 18 32C18 36 20 38 24 38C28 38 30 36 30 32C30 28 24 20 24 20Z" fill="#fbbf24" opacity="0.8"/>
      <path d="M24 30C24 30 22 33 22 35C22 37 23 38 24 38C25 38 26 37 26 35C26 33 24 30 24 30Z" fill="#fef3c7"/>
      <defs>
        <linearGradient id="flame-grad" x1="10" y1="4" x2="38" y2="44">
          <stop offset="0%" stopColor="#ef4444"/>
          <stop offset="50%" stopColor="#f97316"/>
          <stop offset="100%" stopColor="#eab308"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export function BannerIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="4" width="4" height="40" rx="1" fill="#78350f" stroke="#451a03" strokeWidth="1"/>
      <path d="M12 6H36L32 16L36 26H12V6Z" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5"/>
      <path d="M16 12L20 16L16 20" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="10" cy="4" r="3" fill="#d97706" stroke="#92400e" strokeWidth="1"/>
    </svg>
  );
}

export function CoinIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="18" fill="url(#coin-grad)" stroke="#92400e" strokeWidth="2"/>
      <circle cx="24" cy="24" r="14" fill="none" stroke="#d97706" strokeWidth="1"/>
      <text x="24" y="30" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#92400e" fontFamily="serif">E</text>
      <defs>
        <radialGradient id="coin-grad" cx="20" cy="20" r="18">
          <stop offset="0%" stopColor="#fde68a"/>
          <stop offset="100%" stopColor="#f59e0b"/>
        </radialGradient>
      </defs>
    </svg>
  );
}

export function SnowflakeIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 6v36M8.4 15l31.2 18M39.6 15L8.4 33" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M24 6l-4 5h8l-4-5ZM24 42l-4-5h8l-4 5ZM8.4 15l6.3.9-4-6.9-2.3 6ZM39.6 33l-6.3-.9 4 6.9 2.3-6ZM39.6 15l-2.3-6-4 6.9 6.3-.9ZM8.4 33l2.3 6 4-6.9-6.3.9Z" fill="#7dd3fc" stroke="#0284c7" strokeWidth="1"/>
      <circle cx="24" cy="24" r="3.5" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.2"/>
    </svg>
  );
}

export function TrophyIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 8h20v12c0 6.5-4.5 11-10 11s-10-4.5-10-11V8Z" fill="url(#trophy-grad)" stroke="#92400e" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M14 11H7c0 7 3 11 8 12M34 11h7c0 7-3 11-8 12" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="21" y="31" width="6" height="6" fill="#b45309" stroke="#78350f" strokeWidth="1"/>
      <rect x="15" y="37" width="18" height="5" rx="1.5" fill="#92400e" stroke="#451a03" strokeWidth="1.2"/>
      <path d="M20 14l3 2 3-4 2 5" stroke="#fef3c7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <defs>
        <linearGradient id="trophy-grad" x1="14" y1="8" x2="34" y2="31">
          <stop offset="0%" stopColor="#fde68a"/>
          <stop offset="100%" stopColor="#f59e0b"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export function HammerIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="8" width="20" height="11" rx="2.5" fill="url(#hammer-grad)" stroke="#44403c" strokeWidth="1.8"/>
      <path d="M30 10c4 1 6 2 6 3.5S34 18 30 17.5V10Z" fill="#78716c" stroke="#44403c" strokeWidth="1.5"/>
      <rect x="17.5" y="19" width="5" height="22" rx="1.6" fill="#b45309" stroke="#78350f" strokeWidth="1.4"/>
      <rect x="10" y="11" width="20" height="2.5" fill="#fafaf9" opacity="0.4"/>
      <defs>
        <linearGradient id="hammer-grad" x1="10" y1="8" x2="30" y2="19">
          <stop offset="0%" stopColor="#d6d3d1"/>
          <stop offset="100%" stopColor="#78716c"/>
        </linearGradient>
      </defs>
    </svg>
  );
}
