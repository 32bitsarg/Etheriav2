"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/i18n";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";
import { useRouter } from "next/navigation";

interface Props {
  onClose: () => void;
}

export function SettingsModal({ onClose }: Props) {
  const { t, locale, setLocale } = useI18n();
  const auth = useMatecitoAuth();
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleLogout = async () => {
    await auth.signOut();
    router.replace("/");
  };

  const options = [
    { code: "es" as const, label: "Español" },
    { code: "en" as const, label: "English" },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        ref={modalRef}
        className="w-[min(400px,calc(100vw-32px))] overflow-hidden rounded-xl border border-etheria-border bg-[#0b1111] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-etheria-border px-5 py-4">
          <h2 className="font-serif text-lg text-etheria-gold-soft">
            {t("play.settings.title")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-etheria-border-dim px-3 py-1 text-xs text-etheria-text-muted transition-colors hover:text-etheria-gold-soft"
          >
            {t("play.settings.close")}
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-5">
          {/* Language */}
          <div>
            <label className="mb-2 block text-[11px] font-serif uppercase tracking-[0.1em] text-etheria-text-muted">
              {t("play.settings.language")}
            </label>
            <div className="flex gap-2">
              {options.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => setLocale(opt.code)}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    locale === opt.code
                      ? "border-etheria-teal/55 bg-etheria-teal/15 text-etheria-gold-soft"
                      : "border-etheria-border-dim text-etheria-text-muted hover:text-etheria-gold-soft"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Logout */}
          <div className="border-t border-etheria-border pt-4">
            <button
              onClick={handleLogout}
              className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
            >
              {t("play.settings.logout")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
