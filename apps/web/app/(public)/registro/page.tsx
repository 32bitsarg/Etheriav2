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
  confirmEmail?: string;
  password?: string;
  confirmPassword?: string;
}

interface TouchedFields {
  name: boolean;
  cityName: boolean;
  email: boolean;
  confirmEmail: boolean;
  password: boolean;
  confirmPassword: boolean;
}

export default function RegistroPage() {
  const router = useRouter();
  const auth = useMatecitoAuth();
  const { t } = useI18n();

  const [name, setName] = useState("Commander");
  const [cityName, setCityName] = useState("Etheria");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({
    name: false,
    cityName: false,
    email: false,
    confirmEmail: false,
    password: false,
    confirmPassword: false,
  });

  useEffect(() => {
    const remembered = typeof window !== "undefined" ? localStorage.getItem(REMEMBER_EMAIL_KEY) : null;
    if (remembered) setEmail(remembered);
  }, []);

  const passwordStrength = getPasswordStrength(password);

  const validateName = useCallback((value: string) => {
    return validateField(value, nameRules);
  }, []);

  const validateCityName = useCallback((value: string) => {
    return validateField(value, cityNameRules);
  }, []);

  const validateEmail = useCallback((value: string) => {
    return validateField(value, emailRules);
  }, []);

  const validateConfirmEmail = useCallback((value: string) => {
    if (!value) return t("validation.confirmEmail.required");
    if (value !== email) return t("validation.confirmEmail.mismatch");
    return undefined;
  }, [email, t]);

  const validatePassword = useCallback((value: string) => {
    return validateField(value, passwordRules);
  }, []);

  const validateConfirmPassword = useCallback((value: string) => {
    if (!value) return t("validation.confirmPassword.required");
    if (value !== password) return t("validation.confirmPassword.mismatch");
    return undefined;
  }, [password, t]);

  const handleBlur = (field: keyof TouchedFields) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    const validators: Record<keyof TouchedFields, (v: string) => string | undefined> = {
      name: validateName,
      cityName: validateCityName,
      email: validateEmail,
      confirmEmail: validateConfirmEmail,
      password: validatePassword,
      confirmPassword: validateConfirmPassword,
    };

    const values: Record<keyof TouchedFields, string> = {
      name,
      cityName,
      email,
      confirmEmail,
      password,
      confirmPassword,
    };

    const err = validators[field](values[field]);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
  };

  const isFormValid = () => {
    const errors: FormErrors = {
      name: validateName(name),
      cityName: validateCityName(cityName),
      email: validateEmail(email),
      confirmEmail: validateConfirmEmail(confirmEmail),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(confirmPassword),
    };
    setFieldErrors(errors);
    setTouched({ name: true, cityName: true, email: true, confirmEmail: true, password: true, confirmPassword: true });
    return !Object.values(errors).some(Boolean);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isFormValid()) return;

    try {
      const res = await auth.signUp(email, password, { name });
      if ((res as any)?.error) throw new Error((res as any).error.message ?? "Register failed");
      if (remember) localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim().toLowerCase());
      else localStorage.removeItem(REMEMBER_EMAIL_KEY);
      localStorage.setItem("etheria_pending_city_name", cityName.trim());
      router.replace("/play");
    } catch {
      setError(t("register.error"));
    }
  };

  const inputClass = (field: keyof TouchedFields) =>
    `w-full rounded-xl border bg-stone-50 px-4 py-2.5 text-[14px] text-stone-900 outline-none transition-colors focus:bg-white placeholder:text-stone-400 ${
      touched[field] && fieldErrors[field]
        ? "border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400"
        : "border-stone-200 focus:border-amber-500"
    }`;

  const errorText = (msg?: string) =>
    msg ? (
      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
        <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {t(msg)}
      </p>
    ) : null;

  const PasswordToggle = ({ show, onClick }: { show: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
      tabIndex={-1}
    >
      {show ? (
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
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-16">
      <div className="w-full max-w-[480px]">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1
            className="text-3xl font-bold tracking-[-0.02em] text-stone-900"
            style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.15 }}
          >
            {t("register.title")}
          </h1>
          <p
            className="mt-2 text-[16px] text-stone-500"
            style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.5 }}
          >
            {t("register.subtitle")}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Personal Info */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
            <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
              {t("register.name")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-stone-600">
                  {t("register.name")}
                </label>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (touched.name) setFieldErrors((prev) => ({ ...prev, name: validateName(e.target.value) }));
                  }}
                  onBlur={() => handleBlur("name")}
                  className={inputClass("name")}
                  placeholder={t("register.namePlaceholder")}
                  required
                />
                {errorText(fieldErrors.name)}
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-stone-600">
                  {t("register.cityName")}
                </label>
                <input
                  value={cityName}
                  onChange={(e) => {
                    setCityName(e.target.value);
                    if (touched.cityName) setFieldErrors((prev) => ({ ...prev, cityName: validateCityName(e.target.value) }));
                  }}
                  onBlur={() => handleBlur("cityName")}
                  className={inputClass("cityName")}
                  placeholder={t("register.cityNamePlaceholder")}
                  required
                />
                {errorText(fieldErrors.cityName)}
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
            <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
              {t("login.identifier")}
            </h3>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-stone-600">
                {t("register.email")}
              </label>
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched.email) setFieldErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) }));
                }}
                onBlur={() => handleBlur("email")}
                type="email"
                autoComplete="email"
                className={inputClass("email")}
                placeholder={t("register.emailPlaceholder")}
                required
              />
              {errorText(fieldErrors.email)}
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-stone-600">
                {t("register.password")}
              </label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) setFieldErrors((prev) => ({ ...prev, password: validatePassword(e.target.value) }));
                    if (touched.confirmPassword && confirmPassword) {
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: e.target.value !== confirmPassword ? t("validation.password.mismatch") : undefined }));
                    }
                  }}
                  onBlur={() => handleBlur("password")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={inputClass("password")}
                  placeholder={t("register.passwordPlaceholder")}
                  required
                  minLength={6}
                />
                <PasswordToggle show={showPassword} onClick={() => setShowPassword(!showPassword)} />
              </div>
              {errorText(fieldErrors.password)}

              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= passwordStrength.score ? passwordStrength.color : "bg-stone-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-stone-500">
                    {t("validation.strength.weak")}, {t("validation.strength.medium")}, {t("validation.strength.strong")}
                    {" — "}
                    <span className={`font-medium ${
                      passwordStrength.score <= 2 ? "text-red-500" : passwordStrength.score <= 4 ? "text-amber-500" : "text-green-500"
                    }`}>
                      {t(passwordStrength.label)}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-stone-600">
                {t("register.confirmPassword")}
              </label>
              <div className="relative">
                <input
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (touched.confirmPassword) {
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: e.target.value !== password ? t("validation.password.mismatch") : undefined }));
                    }
                  }}
                  onBlur={() => handleBlur("confirmPassword")}
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={inputClass("confirmPassword")}
                  placeholder={t("register.confirmPasswordPlaceholder")}
                  required
                  minLength={6}
                />
                <PasswordToggle show={showConfirmPassword} onClick={() => setShowConfirmPassword(!showConfirmPassword)} />
              </div>
              {errorText(fieldErrors.confirmPassword)}
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
            {t("register.rememberEmail")}
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
                {t("register.loading")}
              </span>
            ) : (
              t("register.submit")
            )}
          </button>

          <div className="pt-2 text-center text-[14px] text-stone-500">
            {t("register.hasAccount")}{" "}
            <Link href="/login" className="font-semibold text-amber-600 hover:text-amber-700 transition-colors">
              {t("register.loginLink")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
