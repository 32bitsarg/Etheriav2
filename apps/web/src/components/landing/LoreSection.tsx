"use client";

import { landingContent } from "@/config/landingContent";

export function LoreSection() {
  const { loreTitle, loreSubtitle, loreParagraphs } = landingContent;

  return (
    <section id="lore" className="relative px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold text-[#f1e2bd] sm:text-4xl">
            {loreTitle}
          </h2>
          <p className="mt-3 text-sm text-etheria-text-muted">{loreSubtitle}</p>
        </div>

        <div className="space-y-6">
          {loreParagraphs.map((paragraph, i) => (
            <p
              key={i}
              className="text-base leading-[1.8] text-etheria-text-muted/80 sm:text-lg"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
