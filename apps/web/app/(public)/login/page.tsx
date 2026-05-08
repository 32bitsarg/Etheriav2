"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";
import { useI18n } from "@/i18n";
import Link from "next/link";
import {
  validateField,
  isEmailOrUsername,
} from "@/lib/authValidation";

const REMEMBER_IDENTIFIER_KEY = "etheria_remember_identifier";

export default function LoginPage() {
  const router = useRouter();
  const auth = useMatecitoAuth();
  const { t } = useI18n();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ identifier: boolean; password: boolean }>({ identifier: false, password: false });

  useEffect(() => {
    const remembered = typeof window !== "undefined" ? localStorage.getItem(REMEMBER_IDENTIFIER_KEY) : null;
    if (remembered) setIdentifier(remembered);
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
    if (field === "identifier") {
      setFieldErrors((prev) => ({ ...prev, identifier: validateIdentifier(identifier) }));
    } else {
      setFieldErrors((prev) => ({ ...prev, password: validatePassword(password) }));
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const idError = validateIdentifier(identifier);
    const passError = validatePassword(password);
    setFieldErrors({ identifier: idError, password: passError });
    setTouched({ identifier: true, password: true });

    if (idError || passError) return;

    try {
      const res = await auth.signIn(identifier.trim(), password);
      if ((res as any)?.error) throw new Error((res as any).error.message ?? "Login failed");
      if (remember) localStorage.setItem(REMEMBER_IDENTIFIER_KEY, identifier.trim().toLowerCase());
      else localStorage.removeItem(REMEMBER_IDENTIFIER_KEY);
      router.replace("/play");
    } catch {
      setError(t("login.error"));
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-16">
      <div className="w-full max-w-[420px]">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h1
            className="text-3xl font-bold tracking-[-0.02em] text-stone-900"
            style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.15 }}
          >
            {t("login.title")}
          </h1>
          <p
            className="mt-2 text-[16px] text-stone-500"
            style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.5 }}
          >
            {t("login.subtitle")}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Form Card */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
            {/* Identifier */}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-stone-600">
                {t("login.identifier")}
              </label>
              <input
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (touched.identifier) {
                    setFieldErrors((prev) => ({ ...prev, identifier: validateIdentifier(e.target.value) }));
                  }
                }}
                onBlur={() => handleBlur("identifier")}
                type="text"
                autoComplete="username"
                className={`w-full rounded-xl border bg-stone-50 px-4 py-2.5 text-[14px] text-stone-900 outline-none transition-colors focus:bg-white placeholder:text-stone-400 ${
                  touched.identifier && fieldErrors.identifier
                    ? "border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                    : "border-stone-200 focus:border-amber-500"
                }`}
                placeholder={t("login.identifierPlaceholder")}
                required
              />
              {touched.identifier && fieldErrors.identifier && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {t(fieldErrors.identifier)}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-stone-600">
                {t("login.password")}
              </label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) {
                      setFieldErrors((prev) => ({ ...prev, password: validatePassword(e.target.value) }));
                    }
                  }}
                  onBlur={() => handleBlur("password")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className={`w-full rounded-xl border bg-stone-50 px-4 py-2.5 pr-11 text-[14px] text-stone-900 outline-none transition-colors focus:bg-white placeholder:text-stone-400 ${
                    touched.password && fieldErrors.password
                      ? "border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                      : "border-stone-200 focus:border-amber-500"
                  }`}
                  placeholder={t("login.passwordPlaceholder")}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {touched.password && fieldErrors.password && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {t(fieldErrors.password)}
                </p>
              )}
            </div>
          </div>

          {/* Remember */}
          <label className="flex items-center gap-3 px-1 text-[14px] text-stone-600 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 accent-amber-500"
            />
            {t("login.rememberEmail")}
          </label>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700 flex items-start gap-2.5">
              <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!auth.ready}
            className="w-full rounded-xl bg-amber-500 px-4 py-3 text-[16px] font-semibold text-white hover:bg-amber-600 transition-all disabled:opacity-60 shadow-sm shadow-amber-500/20 hover:shadow-md hover:shadow-amber-500/30 active:scale-[0.98]"
          >
            {!auth.ready ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t("login.loading")}
              </span>
            ) : (
              t("login.submit")
            )}
          </button>

          <div className="pt-2 text-center text-[14px] text-stone-500">
            {t("login.noAccount")}{" "}
            <Link href="/registro" className="font-semibold text-amber-600 hover:text-amber-700 transition-colors">
              {t("login.registerLink")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
