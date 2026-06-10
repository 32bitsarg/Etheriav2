"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";
import { useI18n } from "@/i18n";
import Link from "next/link";
import Image from "next/image";
import { isEmailOrUsername } from "@/lib/authValidation";
import { setCityId } from "@/lib/guestAuth";

const REMEMBER_IDENTIFIER_KEY = "etheria_remember_identifier";

export default function MobileLoginPage() {
  const router = useRouter();
  const auth = useMatecitoAuth();
  const { t } = useI18n();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [touched, setTouched] = useState({ identifier: false, password: false });
  const [loading, setLoading] = useState(false);

  // Already logged in (e.g. APK relaunch with live session) → straight to game
  useEffect(() => {
    if (auth.ready && auth.isLoggedIn) router.replace("/play");
  }, [auth.ready, auth.isLoggedIn, router]);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_IDENTIFIER_KEY);
    if (saved) setIdentifier(saved);
  }, []);

  const validateIdentifier = useCallback((value: string) => {
    if (!value) return t("validation.identifier.required");
    if (!isEmailOrUsername(value) && value.length < 3) return t("validation.identifier.invalid");
    return undefined;
  }, [t]);

  const validatePassword = useCallback((value: string) => {
    if (!value) return t("validation.password.minLength");
    return undefined;
  }, [t]);

  const handleBlur = (field: "identifier" | "password") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "identifier") setFieldErrors((prev) => ({ ...prev, identifier: validateIdentifier(identifier) }));
    else setFieldErrors((prev) => ({ ...prev, password: validatePassword(password) }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const idError = validateIdentifier(identifier);
    const passError = validatePassword(password);
    setFieldErrors({ identifier: idError, password: passError });
    setTouched({ identifier: true, password: true });
    if (idError || passError) return;
    setLoading(true);
    try {
      const res = await auth.signIn(identifier.trim(), password);
      if (res?.error) {
        setError(res.error.message ?? t("login.error"));
        setLoading(false);
        return;
      }
      if (res.data?.cityId) setCityId(res.data.cityId);
      if (res.data?.worldId) localStorage.setItem("etheria_world_id", res.data.worldId);
      if (remember) localStorage.setItem(REMEMBER_IDENTIFIER_KEY, identifier.trim().toLowerCase());
      else localStorage.removeItem(REMEMBER_IDENTIFIER_KEY);
      router.replace("/play");
    } catch {
      setError("Error de conexión. Verificá tu internet.");
      setLoading(false);
    }
  };

  const inputClass = (field: "identifier" | "password") =>
    `mobile-input w-full rounded-xl border bg-white px-4 py-4 text-base text-stone-900 placeholder:text-stone-400 transition-all focus:bg-white focus:outline-none focus:ring-2 ${
      touched[field] && fieldErrors[field]
        ? "border-red-300 focus:border-red-400 focus:ring-red-400/30"
        : "border-stone-200 focus:border-amber-400 focus:ring-amber-400/30"
    }`;

  return (
    <div
      className="mobile-login-root min-h-screen flex items-center justify-center bg-[#fafaf9] px-4 py-8"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 32px)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/assets/landing/conquest-of-etheria/logo-conquest-of-etheria.webp"
            alt="Etheria"
            width={120}
            height={60}
            className="mx-auto h-14 w-auto"
            priority
          />
        </div>

        <h1 className="text-2xl font-bold text-[#1c1917] text-center" style={{ letterSpacing: "-0.03em" }}>
          {t("login.title")}
        </h1>
        <p className="mt-2 text-center text-sm text-stone-500">
          {t("login.subtitle")}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-600">
              {t("login.emailOrUsername")}
            </label>
            <input
              type="text"
              autoComplete="username"
              placeholder={t("login.emailPlaceholder")}
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (touched.identifier) setFieldErrors((p) => ({ ...p, identifier: validateIdentifier(e.target.value) }));
              }}
              onBlur={() => handleBlur("identifier")}
              className={inputClass("identifier")}
            />
            {touched.identifier && fieldErrors.identifier && (
              <p className="mt-1.5 text-xs text-red-600">{fieldErrors.identifier}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-stone-600">
              {t("login.password")}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder={t("login.passwordPlaceholder")}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (touched.password) setFieldErrors((p) => ({ ...p, password: validatePassword(e.target.value) }));
                }}
                onBlur={() => handleBlur("password")}
                className={`${inputClass("password")} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center text-stone-400 active:text-stone-600"
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  {showPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  ) : (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </>
                  )}
                </svg>
              </button>
            </div>
            {touched.password && fieldErrors.password && (
              <p className="mt-1.5 text-xs text-red-600">{fieldErrors.password}</p>
            )}
          </div>

          <label className="flex items-center gap-2.5 text-sm text-stone-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-5 w-5 rounded border-stone-300 accent-amber-500"
            />
            {t("login.rememberEmail")}
          </label>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !auth.ready}
            className="mobile-btn w-full rounded-xl bg-amber-500 px-4 py-4 text-base font-bold text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600 active:scale-[0.98] disabled:opacity-60"
          >
            {loading || !auth.ready ? t("login.loading") : t("login.submit")}
          </button>

          <p className="text-center text-sm text-stone-500">
            {t("login.noAccount")}{" "}
            <Link href="/mobile/register" className="font-semibold text-amber-600 hover:text-amber-700">
              {t("login.createAccount")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
