"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";
import { useI18n } from "@/i18n";
import Link from "next/link";
import Image from "next/image";
import {
  validateField,
  nameRules,
  cityNameRules,
  emailRules,
  passwordRules,
  getPasswordStrength,
} from "@/lib/authValidation";

type FieldName = "name" | "cityName" | "email" | "password" | "confirmPassword";

export default function MobileRegisterPage() {
  const router = useRouter();
  const auth = useMatecitoAuth();
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [cityName, setCityName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({
    name: false, cityName: false, email: false, password: false, confirmPassword: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth.ready && auth.isLoggedIn) router.replace("/play");
  }, [auth.ready, auth.isLoggedIn, router]);

  const passwordStrength = getPasswordStrength(password);

  const validators: Record<FieldName, (v: string) => string | undefined> = {
    name: (v) => validateField(v, nameRules),
    cityName: (v) => validateField(v, cityNameRules),
    email: (v) => validateField(v, emailRules),
    password: (v) => validateField(v, passwordRules),
    confirmPassword: useCallback((v: string) => {
      if (!v) return t("validation.confirmPassword.required");
      if (v !== password) return t("validation.confirmPassword.mismatch");
      return undefined;
    }, [password, t]),
  };

  const values: Record<FieldName, string> = { name, cityName, email, password, confirmPassword };

  const handleBlur = (field: FieldName) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors((prev) => ({ ...prev, [field]: validators[field](values[field]) }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errors = Object.fromEntries(
      (Object.keys(validators) as FieldName[]).map((f) => [f, validators[f](values[f])])
    ) as Partial<Record<FieldName, string>>;
    setFieldErrors(errors);
    setTouched({ name: true, cityName: true, email: true, password: true, confirmPassword: true });
    if (Object.values(errors).some(Boolean)) return;
    setLoading(true);
    try {
      const res = await auth.signUp(email.trim(), password, { name: name.trim() });
      if (res?.error) {
        setError(res.error.message ?? t("register.error"));
        setLoading(false);
        return;
      }
      localStorage.setItem("etheria_pending_city_name", cityName.trim());
      router.replace("/play");
    } catch {
      setError("Error de conexión. Verificá tu internet.");
      setLoading(false);
    }
  };

  const inputClass = (field: FieldName) =>
    `mobile-input w-full rounded-xl border bg-white px-4 py-4 text-base text-stone-900 placeholder:text-stone-400 transition-all focus:bg-white focus:outline-none focus:ring-2 ${
      touched[field] && fieldErrors[field]
        ? "border-red-300 focus:border-red-400 focus:ring-red-400/30"
        : "border-stone-200 focus:border-amber-400 focus:ring-amber-400/30"
    }`;

  const errorText = (field: FieldName) =>
    touched[field] && fieldErrors[field]
      ? <p className="mt-1.5 text-xs text-red-600">{t(fieldErrors[field]!)}</p>
      : null;

  const onChange = (field: FieldName, setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    if (touched[field]) setFieldErrors((p) => ({ ...p, [field]: validators[field](e.target.value) }));
  };

  return (
    <div
      className="mobile-login-root min-h-screen flex items-center justify-center bg-[#fafaf9] px-4 py-8"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 32px)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)" }}
    >
      <div className="w-full max-w-sm">
        <Image
          src="/assets/landing/conquest-of-etheria/logo-conquest-of-etheria.webp"
          alt="Etheria" width={120} height={60} className="mx-auto h-14 w-auto mb-8" priority
        />

        <h1 className="text-2xl font-bold text-[#1c1917] text-center" style={{ letterSpacing: "-0.03em" }}>
          {t("register.title")}
        </h1>
        <p className="mt-2 text-center text-sm text-stone-500">{t("register.subtitle")}</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-600">{t("register.name")}</label>
            <input
              type="text" autoComplete="nickname" placeholder={t("register.namePlaceholder")}
              value={name} onChange={onChange("name", setName)} onBlur={() => handleBlur("name")}
              className={inputClass("name")}
            />
            {errorText("name")}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-stone-600">{t("register.cityName")}</label>
            <input
              type="text" placeholder={t("register.cityNamePlaceholder")}
              value={cityName} onChange={onChange("cityName", setCityName)} onBlur={() => handleBlur("cityName")}
              className={inputClass("cityName")}
            />
            {errorText("cityName")}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-stone-600">{t("register.email")}</label>
            <input
              type="email" autoComplete="email" inputMode="email" placeholder={t("register.emailPlaceholder")}
              value={email} onChange={onChange("email", setEmail)} onBlur={() => handleBlur("email")}
              className={inputClass("email")}
            />
            {errorText("email")}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-stone-600">{t("register.password")}</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} autoComplete="new-password"
                placeholder={t("register.passwordPlaceholder")}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (touched.password) setFieldErrors((p) => ({ ...p, password: validators.password(e.target.value) }));
                  if (touched.confirmPassword) {
                    setFieldErrors((p) => ({
                      ...p,
                      confirmPassword: confirmPassword && e.target.value !== confirmPassword
                        ? t("validation.confirmPassword.mismatch")
                        : undefined,
                    }));
                  }
                }}
                onBlur={() => handleBlur("password")}
                className={`${inputClass("password")} pr-12`}
              />
              <button
                type="button" tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center text-stone-400 active:text-stone-600"
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
            {password.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(passwordStrength.score / 4) * 100}%`, backgroundColor: passwordStrength.color }}
                  />
                </div>
                <span className="text-[11px] font-medium" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
            {errorText("password")}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-stone-600">{t("register.confirmPassword")}</label>
            <input
              type={showPassword ? "text" : "password"} autoComplete="new-password"
              placeholder={t("register.confirmPasswordPlaceholder")}
              value={confirmPassword} onChange={onChange("confirmPassword", setConfirmPassword)}
              onBlur={() => handleBlur("confirmPassword")}
              className={inputClass("confirmPassword")}
            />
            {errorText("confirmPassword")}
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit" disabled={loading || !auth.ready}
            className="mobile-btn w-full rounded-xl bg-amber-500 px-4 py-4 text-base font-bold text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? t("register.loading") : t("register.submit")}
          </button>

          <p className="text-center text-sm text-stone-500">
            {t("register.hasAccount")}{" "}
            <Link href="/mobile/login" className="font-semibold text-amber-600 hover:text-amber-700">
              {t("register.loginLink")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
