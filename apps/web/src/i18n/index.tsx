"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import es from "./es.json";
import en from "./en.json";

type Locale = "es" | "en";
type Messages = typeof es;

const messages: Record<Locale, Messages> = { es, en };

interface I18nContextType {
  locale: Locale;
  t: (key: string) => string;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? "es");

  useEffect(() => {
    const stored = localStorage.getItem("etheria_locale") as Locale | null;
    if (stored && (stored === "es" || stored === "en")) {
      setLocaleState(stored);
    } else {
      const browserLang = navigator.language.split("-")[0];
      if (browserLang === "en") setLocaleState("en");
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("etheria_locale", newLocale);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "es" ? "en" : "es");
  }, [locale, setLocale]);

  const t = useCallback(
    (key: string): string => {
      const keys = key.split(".");
      let value: any = messages[locale];
      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = value[k];
        } else {
          return key;
        }
      }
      return typeof value === "string" ? value : key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, t, setLocale, toggleLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function useLocale() {
  return useI18n().locale;
}

export function useTranslation() {
  const { t } = useI18n();
  return { t };
}