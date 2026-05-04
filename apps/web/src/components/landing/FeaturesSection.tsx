"use client";

import { landingContent } from "@/config/landingContent";

export function FeaturesSection() {
  const { featuresTitle, featuresSubtitle, features } = landingContent;

  return (
    <section id="features" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            {featuresTitle}
          </h2>
          <p className="mt-3 text-stone-400">{featuresSubtitle}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <div
              key={i}
              className="rounded-2xl border border-stone-800 bg-stone-900/50 p-6 transition-colors hover:border-stone-700"
            >
              <div className="mb-4 inline-flex rounded-xl bg-stone-800 p-3 text-2xl">
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
