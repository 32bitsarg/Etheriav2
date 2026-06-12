"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";
import { useI18n } from "@/i18n";
import Link from "next/link";
import {
  validateField,
  emailRules,
  passwordRules,
  nameRules,
  cityNameRules,
  getPasswordStrength,
} from "@/lib/authValidation";

const REMEMBER_EMAIL_KEY = "etheria_remember_email";

interface FormErrors {
  name?: string;
  cityName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface TouchedFields {
  name: boolean;
  cityName: boolean;
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
}

export default function RegistroPage() {
  const router = useRouter();
  const auth = useMatecitoAuth();
  const { t } = useI18n();

  const DEV_AUTO_LOGIN = process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === "true";
  const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_EMAIL ?? "";
  const DEV_PASSWORD = process.env.NEXT_PUBLIC_DEV_PASSWORD ?? "";

  useEffect(() => {
    if (auth.ready && auth.isLoggedIn) router.replace("/play");
  }, [auth.ready, auth.isLoggedIn, router]);

  const [name, setName] = useState("Commander");
  const [cityName, setCityName] = useState("Etheria");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({
    name: false, cityName: false, email: false, password: false, confirmPassword: false,
  });

  useEffect(() => {
    const remembered = typeof window !== "undefined" ? localStorage.getItem(REMEMBER_EMAIL_KEY) : null;
    if (remembered) setEmail(remembered);
  }, []);

  const passwordStrength = getPasswordStrength(password);

  const validateName = useCallback((v: string) => validateField(v, nameRules), []);
  const validateCityName = useCallback((v: string) => validateField(v, cityNameRules), []);
  const validateEmail = useCallback((v: string) => validateField(v, emailRules), []);
  const validatePassword = useCallback((v: string) => validateField(v, passwordRules), []);
  const validateConfirmPassword = useCallback((v: string) => {
    if (!v) return t("validation.confirmPassword.required");
    if (v !== password) return t("validation.confirmPassword.mismatch");
    return undefined;
  }, [password, t]);

  const handleBlur = (field: keyof TouchedFields) => {
    setTouched((p) => ({ ...p, [field]: true }));
    const map = { name: validateName, cityName: validateCityName, email: validateEmail, password: validatePassword, confirmPassword: validateConfirmPassword };
    const vals = { name, cityName, email, password, confirmPassword };
    setFieldErrors((p) => ({ ...p, [field]: map[field](vals[field]) }));
  };

  const isFormValid = () => {
    const errors: FormErrors = {
      name: validateName(name),
      cityName: validateCityName(cityName),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(confirmPassword),
    };
    setFieldErrors(errors);
    setTouched({ name: true, cityName: true, email: true, password: true, confirmPassword: true });
    return !Object.values(errors).some(Boolean);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isFormValid()) return;
    try {
      const res = await auth.signUp(email, password, { name });
      if ((res as any)?.error) {
        setError((res as any).error.message ?? t("register.error"));
        return;
      }
      if (remember) localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim().toLowerCase());
      else localStorage.removeItem(REMEMBER_EMAIL_KEY);
      localStorage.setItem("etheria_pending_city_name", cityName.trim());
      router.replace("/play");
    } catch {
      setError(t("register.error"));
    }
  };

  const inputClass = (field: keyof TouchedFields) =>
    `w-full rounded-lg border bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus:bg-white focus:outline-none focus:ring-1 ${
      touched[field] && fieldErrors[field]
        ? "border-red-300 focus:border-red-400 focus:ring-red-400"
        : "border-stone-200 focus:border-amber-400 focus:ring-amber-400"
    }`;

  const errorText = (msg?: string) =>
    msg ? <p className="mt-1.5 text-xs text-red-600">{t(msg)}</p> : null;

  const EyeToggle = ({ show, onClick }: { show: boolean; onClick: () => void }) => (
    <button type="button" onClick={onClick} tabIndex={-1}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </button>
  );

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left: imagery */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        <img
          src="/assets/landing/conquest-of-etheria/hero-conquest-of-etheria.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-stone-950/85 via-stone-900/55 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-3">
            <img src="/assets/landing/conquest-of-etheria/logo-conquest-of-etheria.png" className="h-14 w-auto" alt="Etheria" />
          </Link>
          <div className="max-w-md">
            <h2 className="text-4xl font-bold leading-tight text-white" style={{ letterSpacing: "-0.03em" }}>
              Funda tu imperio en 30 segundos.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-stone-300">
              Tu aldea se crea automáticamente en una isla con espacio disponible. Sin descargas, gratis para jugar.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Aldea y recursos iniciales listos",
                "Protección de novato para empezar tranquilo",
                "Únete a una alianza desde el día uno",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-[14px] text-stone-200">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/assets/landing/conquest-of-etheria/logo-conquest-of-etheria.png" className="h-12 w-auto" alt="Etheria" />
          </Link>

          {DEV_AUTO_LOGIN && (
            <div className="mb-4 rounded-lg border border-yellow-400/40 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
              <span className="font-semibold">Modo dev activo</span>{" "}
              <button type="button" className="underline hover:text-yellow-600"
                onClick={async () => { const r = await auth.signIn(DEV_EMAIL, DEV_PASSWORD); if (!(r as any)?.error) router.replace("/play"); }}>
                Entrar como dev
              </button>
            </div>
          )}

          <div className="mb-7">
            <h1 className="text-3xl font-bold text-stone-900" style={{ letterSpacing: "-0.03em" }}>
              {t("register.title")}
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-stone-500">
              {t("register.subtitle")}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-3.5">
            {/* Name + City */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-stone-600">{t("register.name")}</label>
                <input
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (touched.name) setFieldErrors((p) => ({ ...p, name: validateName(e.target.value) })); }}
                  onBlur={() => handleBlur("name")}
                  className={inputClass("name")}
                  placeholder={t("register.namePlaceholder")}
                />
                {errorText(fieldErrors.name)}
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-stone-600">{t("register.cityName")}</label>
                <input
                  value={cityName}
                  onChange={(e) => { setCityName(e.target.value); if (touched.cityName) setFieldErrors((p) => ({ ...p, cityName: validateCityName(e.target.value) })); }}
                  onBlur={() => handleBlur("cityName")}
                  className={inputClass("cityName")}
                  placeholder={t("register.cityNamePlaceholder")}
                />
                {errorText(fieldErrors.cityName)}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-stone-600">{t("register.email")}</label>
              <input
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (touched.email) setFieldErrors((p) => ({ ...p, email: validateEmail(e.target.value) })); }}
                onBlur={() => handleBlur("email")}
                type="email"
                autoComplete="email"
                className={inputClass("email")}
                placeholder={t("register.emailPlaceholder")}
              />
              {errorText(fieldErrors.email)}
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-stone-600">{t("register.password")}</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) setFieldErrors((p) => ({ ...p, password: validatePassword(e.target.value) }));
                    if (touched.confirmPassword && confirmPassword) {
                      setFieldErrors((p) => ({ ...p, confirmPassword: e.target.value !== confirmPassword ? t("validation.password.mismatch") : undefined }));
                    }
                  }}
                  onBlur={() => handleBlur("password")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={inputClass("password")}
                  placeholder={t("register.passwordPlaceholder")}
                  minLength={6}
                />
                <EyeToggle show={showPassword} onClick={() => setShowPassword(!showPassword)} />
              </div>
              {errorText(fieldErrors.password)}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex flex-1 gap-0.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= Math.ceil(passwordStrength.score * 4 / 6) ? passwordStrength.color : "bg-stone-200"
                      }`} />
                    ))}
                  </div>
                  <span className={`mt-1 text-[11px] font-medium ${
                    passwordStrength.score <= 2 ? "text-red-500" : passwordStrength.score <= 4 ? "text-amber-500" : "text-green-500"
                  }`}>{t(passwordStrength.label)}</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-stone-600">{t("register.confirmPassword")}</label>
              <div className="relative">
                <input
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (touched.confirmPassword) {
                      setFieldErrors((p) => ({ ...p, confirmPassword: e.target.value !== password ? t("validation.password.mismatch") : undefined }));
                    }
                  }}
                  onBlur={() => handleBlur("confirmPassword")}
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={inputClass("confirmPassword")}
                  placeholder={t("register.confirmPasswordPlaceholder")}
                  minLength={6}
                />
                <EyeToggle show={showConfirmPassword} onClick={() => setShowConfirmPassword(!showConfirmPassword)} />
              </div>
              {errorText(fieldErrors.confirmPassword)}
            </div>

            {/* Remember */}
            <label className="flex items-center gap-2 pt-1 text-[13px] text-stone-600 cursor-pointer">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 accent-amber-500" />
              {t("register.rememberEmail")}
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={!auth.ready}
              className="w-full rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-amber-500/20 transition-colors hover:bg-amber-600 disabled:opacity-60"
            >
              {!auth.ready ? t("register.loading") : t("register.submit")}
            </button>

            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-700 leading-relaxed">
              <strong>Early Access:</strong> {t("register.emailNotice")}
            </div>
          </form>

          <p className="mt-6 text-center text-[14px] text-stone-500">
            {t("register.hasAccount")}{" "}
            <Link href="/login" className="font-semibold text-amber-600 hover:text-amber-700">{t("register.loginLink")}</Link>
          </p>
          <p className="mt-6 text-center text-[12px] text-stone-400">
            <Link href="/" className="hover:text-stone-600">← Volver al inicio</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
