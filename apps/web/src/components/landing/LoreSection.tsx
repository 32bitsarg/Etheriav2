"use client";

import { landingContent } from "@/config/landingContent";

export function LoreSection() {
  const { loreTitle, loreSubtitle, loreParagraphs } = landingContent;

  return (
    <section id="lore" className="px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            {loreTitle}
          </h2>
          <p className="mt-3 text-stone-400">{loreSubtitle}</p>
        </div>

        <div className="space-y-6 rounded-2xl border border-stone-800 bg-stone-900/50 p-8 sm:p-10">
          {loreParagraphs.map((paragraph, i) => (
            <p
              key={i}
              className="text-base leading-[1.8] text-stone-300 sm:text-lg"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
