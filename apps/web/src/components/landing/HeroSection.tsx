"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";
import {
  validateField,
  ValidationRule,
  emailRules,
  passwordRules,
  getPasswordStrength,
} from "@/lib/authValidation";

function RuleCheck({ rule, value, t }: { rule: ValidationRule; value: string; t: (key: string) => string }) {
  const pass = rule.test(value);
  const hasInput = value.length > 0;
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      {pass ? (
        <svg className="w-3 h-3 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : hasInput ? (
        <svg className="w-3 h-3 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      ) : (
        <div className="w-3 h-3 rounded-full border border-stone-300 shrink-0" />
      )}
      <span className={pass ? "text-green-600" : hasInput ? "text-red-500" : "text-stone-400"}>
        {t(rule.message)}
      </span>
    </div>
  );
}

export function HeroSection() {
  const { t } = useI18n();
  const router = useRouter();
  const auth = useMatecitoAuth();
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; confirmEmail?: string; password?: string; confirmPassword?: string }>({});
  const [touched, setTouched] = useState<{ email: boolean; confirmEmail: boolean; password: boolean; confirmPassword: boolean }>({ email: false, confirmEmail: false, password: false, confirmPassword: false });

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

  const passwordStrength = getPasswordStrength(password);

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emailError = validateEmail(email);
    const confirmEmailError = validateConfirmEmail(confirmEmail);
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(confirmPassword);
    setFieldErrors({ email: emailError, confirmEmail: confirmEmailError, password: passwordError, confirmPassword: confirmPasswordError });
    setTouched({ email: true, confirmEmail: true, password: true, confirmPassword: true });

    if (emailError || confirmEmailError || passwordError || confirmPasswordError) return;

    try {
      const res = await auth.signUp(email, password, { name: email.split("@")[0] });
      if ((res as any)?.error) {
        setError((res as any).error.message ?? t("hero.form.error"));
        return;
      }
      localStorage.setItem("etheria_pending_city_name", `${email.split("@")[0]}'s Village`);
      router.replace("/play");
    } catch {
      setError(t("hero.form.error"));
    }
  };

  const inputClass = (field: "email" | "confirmEmail" | "password" | "confirmPassword") =>
    `w-full rounded-lg border px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 transition-colors ${
      touched[field] && fieldErrors[field]
        ? "border-red-300 bg-red-50/50 focus:border-red-400 focus:ring-red-400"
        : "border-stone-200 bg-stone-50 focus:border-amber-400 focus:ring-amber-400"
    }`;

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="/assets/landing/conquest-of-etheria/hero-conquest-of-etheria.png"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/60 to-white/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/70 via-transparent to-white/70" />
      </div>

      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-6xl flex-col items-center gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
        {/* Left: Text */}
        <div className="flex max-w-2xl flex-col items-center text-center lg:items-start lg:text-left">
          <img
            src="/assets/landing/conquest-of-etheria/logo-conquest-of-etheria-transparent.png"
            alt="Conquest of Etheria"
            className="mb-6 h-16 w-auto sm:h-20 md:h-24"
          />

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-50/80 px-4 py-1.5 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-700">
              {t("hero.badge")}
            </span>
          </div>

          <h1
            className="text-5xl font-bold tracking-[-0.03em] text-stone-900 sm:text-6xl md:text-7xl lg:text-8xl"
            style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.05 }}
          >
            {t("hero.gameName")}
          </h1>

          <p
            className="mt-4 text-xl font-medium text-stone-700 sm:text-2xl md:text-3xl"
            style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.5 }}
          >
            {t("hero.tagline")}
          </p>

          <p
            className="mx-auto mt-3 max-w-xl text-base text-stone-500 sm:text-lg lg:mx-0"
            style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.6 }}
          >
            {t("hero.subtitle")}
          </p>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-3 gap-6 sm:gap-10">
            {[
              { value: "50K+", label: t("hero.stats.players") },
              { value: "12K+", label: t("hero.stats.battles") },
              { value: "8K+", label: t("hero.stats.empires") },
            ].map((stat) => (
              <div key={stat.label} className="text-center lg:text-left">
                <div
                  className="text-2xl font-bold text-stone-900 sm:text-3xl"
                  style={{ fontFamily: "Inter, system-ui, sans-serif", letterSpacing: "-0.02em" }}
                >
                  {stat.value}
                </div>
                <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-stone-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Quick Register Form */}
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-stone-200/80 bg-white/90 p-6 shadow-xl shadow-stone-200/50 backdrop-blur-xl">
            <div className="mb-4 text-center">
              <h2
                className="text-xl font-bold text-stone-900"
                style={{ fontFamily: "Inter, system-ui, sans-serif" }}
              >
                {t("hero.form.title")}
              </h2>
              <p className="mt-1 text-sm text-stone-500">{t("hero.form.subtitle")}</p>
            </div>

            <form onSubmit={handleQuickRegister} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  {t("hero.form.email")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touched.email) setFieldErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) }));
                    if (touched.confirmEmail && confirmEmail) {
                      setFieldErrors((prev) => ({ ...prev, confirmEmail: e.target.value !== confirmEmail ? t("validation.confirmEmail.mismatch") : undefined }));
                    }
                  }}
                  placeholder="you@example.com"
                  className={inputClass("email")}
                  required
                />
                {touched.email && fieldErrors.email && (
                  <p className="mt-1 text-[11px] text-red-600">{t(fieldErrors.email)}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  {t("hero.form.confirmEmail")}
                </label>
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => {
                    setConfirmEmail(e.target.value);
                    if (touched.confirmEmail) {
                      setFieldErrors((prev) => ({ ...prev, confirmEmail: e.target.value !== email ? t("validation.confirmEmail.mismatch") : undefined }));
                    }
                  }}
                  placeholder="you@example.com"
                  className={inputClass("confirmEmail")}
                  required
                />
                {touched.confirmEmail && fieldErrors.confirmEmail && (
                  <p className="mt-1 text-[11px] text-red-600">{t(fieldErrors.confirmEmail)}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  {t("hero.form.password")}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (touched.password) setFieldErrors((prev) => ({ ...prev, password: validatePassword(e.target.value) }));
                      if (touched.confirmPassword && confirmPassword) {
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: e.target.value !== confirmPassword ? t("validation.confirmPassword.mismatch") : undefined }));
                      }
                    }}
                    placeholder={t("hero.form.passwordPlaceholder")}
                    className={`${inputClass("password")} pr-10`}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                {touched.password && fieldErrors.password && (
                  <p className="mt-1 text-[11px] text-red-600">{t(fieldErrors.password)}</p>
                )}

                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i <= passwordStrength.score ? passwordStrength.color : "bg-stone-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  {t("hero.form.confirmPassword")}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (touched.confirmPassword) {
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: e.target.value !== password ? t("validation.confirmPassword.mismatch") : undefined }));
                      }
                    }}
                    placeholder={t("hero.form.passwordPlaceholder")}
                    className={`${inputClass("confirmPassword")} pr-10`}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                {touched.confirmPassword && fieldErrors.confirmPassword && (
                  <p className="mt-1 text-[11px] text-red-600">{t(fieldErrors.confirmPassword)}</p>
                )}
              </div>

              {error && (
                <p className="text-xs text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={!auth.ready}
                className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm shadow-amber-500/20"
              >
                {!auth.ready ? t("hero.form.loading") : t("hero.form.submit")}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-stone-500">
              <span>{t("hero.form.hasAccount")}</span>
              <Link href="/login" className="font-semibold text-amber-600 hover:text-amber-700 transition-colors">
                {t("hero.form.loginLink")}
              </Link>
            </div>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-stone-400">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>{t("hero.form.secure")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="h-6 w-6 border-b-2 border-r-2 border-stone-400 rotate-45" />
      </div>
    </section>
  );
}
