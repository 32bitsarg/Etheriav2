"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";
import { LanguageSwitcher } from "@/components/landing/LanguageSwitcher";

export function LandingNavbar() {
  const { t } = useI18n();
  const router = useRouter();
  const auth = useMatecitoAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!identifier.trim() || !password) {
      setError(t("nav.quickLogin.error"));
      return;
    }
    try {
      const res = await auth.signIn(identifier.trim(), password);
      if ((res as any)?.error) {
        setError((res as any).error.message ?? t("nav.quickLogin.error"));
        return;
      }
      router.replace("/play");
    } catch {
      setError(t("nav.quickLogin.error"));
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="border-b border-stone-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/assets/landing/conquest-of-etheria/logo-conquest-of-etheria.png"
              alt="Etheria"
              className="h-7 w-auto"
            />
          </Link>

          <div className="flex items-center gap-5">
            <Link
              href="/changelog"
              className="text-[14px] font-medium text-stone-500 hover:text-stone-900 transition-colors"
            >
              {t("nav.changelog")}
            </Link>
            <LanguageSwitcher />

            <div className="h-4 w-px bg-stone-200" />

            {/* Quick Login */}
            <form onSubmit={handleQuickLogin} className="flex items-center gap-2">
              <div className="relative">
                <input
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError("");
                  }}
                  type="text"
                  placeholder={t("nav.quickLogin.identifier")}
                  className="w-36 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-[13px] text-stone-900 placeholder:text-stone-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-400 transition-colors"
                  autoComplete="username"
                />
              </div>
              <input
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                type="password"
                placeholder={t("nav.quickLogin.password")}
                className="w-32 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-[13px] text-stone-900 placeholder:text-stone-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-400 transition-colors"
                autoComplete="current-password"
              />
              <button
                type="submit"
                disabled={!auth.ready}
                className="rounded-lg bg-amber-500 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm shadow-amber-500/20 whitespace-nowrap"
              >
                {t("nav.quickLogin.submit")}
              </button>
            </form>

            <Link
              href="/registro"
              className="rounded-lg bg-stone-900 px-5 py-2 text-[14px] font-semibold text-white hover:bg-stone-800 transition-colors shadow-sm"
            >
              {t("nav.register")}
            </Link>
          </div>
        </div>

        {error && (
          <div className="mx-auto max-w-7xl px-6 pb-2">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-stone-200/50 to-transparent" />
    </nav>
  );
}
