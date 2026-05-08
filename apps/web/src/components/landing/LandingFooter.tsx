"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";

export function LandingFooter() {
  const { t } = useI18n();

  return (
    <footer className="relative overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img
          src="/assets/backgrounds/world-map-ground.png"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-stone-900/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/50 to-transparent" />
      </div>

      {/* Top decorative border */}
      <div className="relative h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

      <div className="relative px-6 py-12">
        <div className="mx-auto max-w-6xl">
          {/* Main footer content */}
          <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <img
                src="/assets/landing/conquest-of-etheria/logo-conquest-of-etheria.png"
                alt="Etheria"
                className="h-7 w-auto brightness-0 invert"
              />
              <div className="text-left">
                <p
                  className="text-[15px] font-semibold text-stone-100"
                  style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                >
                  {t("footer.brand")}
                </p>
                <p className="text-[13px] text-stone-400">{t("footer.tagline")}</p>
              </div>
            </div>

            {/* Links */}
            <div className="flex items-center gap-8">
              {[
                { label: t("footer.links.0.label"), href: t("footer.links.0.href") },
                { label: t("footer.links.1.label"), href: t("footer.links.1.href") },
                { label: t("footer.links.2.label"), href: t("footer.links.2.href") },
              ].map((link, i) => (
                <Link
                  key={i}
                  href={link.href}
                  className="text-[14px] text-stone-400 hover:text-amber-400 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="mt-8 h-px bg-stone-800" />

          {/* Bottom */}
          <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-[12px] text-stone-500">{t("footer.copyright")}</p>
            <p className="text-[12px] text-stone-500">{t("footer.developer")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
