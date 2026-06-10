"use client";

import { useRef, useState, useCallback, useEffect, type ReactNode } from "react";

// Full-screen snap carousel for mobile pickers (worlds, races).
// Native feel: CSS scroll-snap does the physics, the centered card is the
// implicit selection, dots track position, CTA stays in the thumb zone.
export function MobileSelectCarousel({
  items,
  renderItem,
  onActiveChange,
}: {
  items: { key: string }[];
  renderItem: (index: number, isActive: boolean) => ReactNode;
  onActiveChange: (index: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.children.length === 0) return;
    const cardWidth = (el.children[0] as HTMLElement).offsetWidth + 12; // + gap
    const index = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollLeft / cardWidth)));
    setActiveIndex((prev) => {
      if (prev !== index) onActiveChange(index);
      return index;
    });
  }, [items.length, onActiveChange]);

  useEffect(() => {
    onActiveChange(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollTo = (index: number) => {
    const el = scrollRef.current;
    if (!el || !el.children[index]) return;
    (el.children[index] as HTMLElement).scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden px-[7.5vw] pb-2"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {items.map((item, i) => (
          <div
            key={item.key}
            className="w-[85vw] shrink-0 snap-center"
            onClick={() => scrollTo(i)}
          >
            {renderItem(i, i === activeIndex)}
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-2 py-3">
        {items.map((item, i) => (
          <button
            key={item.key}
            onClick={() => scrollTo(i)}
            aria-label={`Ir a opción ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-200 ${
              i === activeIndex ? "w-6 bg-amber-400" : "w-2 bg-white/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
