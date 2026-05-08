"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n, useLocale } from "@/i18n";

function ArgentinaFlag() {
  return (
    <svg width="24" height="16" viewBox="0 0 24 16" className="rounded-sm overflow-hidden shadow-sm">
      <rect width="24" height="16" fill="#75AADB"/>
      <rect y="5.33" width="24" height="5.33" fill="#FFFFFF"/>
      <circle cx="12" cy="8" r="2" fill="#FCBF49"/>
    </svg>
  );
}

function USAFlag() {
  return (
    <svg width="24" height="16" viewBox="0 0 24 16" className="rounded-sm overflow-hidden shadow-sm">
      <rect width="24" height="16" fill="#B22234"/>
      {[0,2,4,6,8,10,12,14].map((y) => (
        <rect key={y} y={y} width="24" height="1.33" fill="#FFFFFF"/>
      ))}
      <rect width="9.6" height="8.67" fill="#3C3B6E"/>
      <rect x="1.6" y="1.2" width="1" height="1" fill="#FFFFFF" rx="0.2"/>
      <rect x="4.8" y="1.2" width="1" height="1" fill="#FFFFFF" rx="0.2"/>
      <rect x="8" y="1.2" width="1" height="1" fill="#FFFFFF" rx="0.2"/>
      <rect x="1.6" y="3.6" width="1" height="1" fill="#FFFFFF" rx="0.2"/>
      <rect x="4.8" y="3.6" width="1" height="1" fill="#FFFFFF" rx="0.2"/>
      <rect x="8" y="3.6" width="1" height="1" fill="#FFFFFF" rx="0.2"/>
      <rect x="1.6" y="6" width="1" height="1" fill="#FFFFFF" rx="0.2"/>
      <rect x="4.8" y="6" width="1" height="1" fill="#FFFFFF" rx="0.2"/>
      <rect x="8" y="6" width="1" height="1" fill="#FFFFFF" rx="0.2"/>
    </svg>
  );
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { setLocale } = useI18n();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const options = [
    { code: "es" as const, label: "Español", Flag: ArgentinaFlag },
    { code: "en" as const, label: "English", Flag: USAFlag },
  ];

  const current = options.find((o) => o.code === locale) ?? options[0];

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-600 hover:border-stone-300 hover:text-stone-900 transition-all"
      >
        <current.Flag />
        <span className="font-medium">{current.code.toUpperCase()}</span>
        <svg className="h-3 w-3 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-stone-200 bg-white shadow-xl overflow-hidden z-50">
          {options.map((opt) => (
            <button
              key={opt.code}
              onClick={() => {
                setLocale(opt.code);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                locale === opt.code
                  ? "bg-amber-50 text-amber-700"
                  : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              }`}
            >
              <opt.Flag />
              <span className="font-medium">{opt.label}</span>
              {locale === opt.code && (
                <svg className="ml-auto h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}