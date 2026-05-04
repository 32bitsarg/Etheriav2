"use client";

import { landingContent } from "@/config/landingContent";

export function FeaturesSection() {
  const { featuresTitle, featuresSubtitle, features } = landingContent;

  return (
    <section id="features" className="relative px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl font-bold text-[#f1e2bd] sm:text-4xl">
            {featuresTitle}
          </h2>
          <p className="mt-3 text-sm text-etheria-text-muted">{featuresSubtitle}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <div
              key={i}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all hover:border-white/[0.1] hover:bg-white/[0.04]"
            >
              <div className="mb-4 inline-flex rounded-xl bg-white/[0.04] p-3 text-2xl">
                {feature.icon}
              </div>
              <h3 className="font-display text-base font-semibold text-[#f1e2bd]">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-etheria-text-muted/80">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
