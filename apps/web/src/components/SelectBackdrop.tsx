"use client";

// Full-screen art backdrop for the race/world selection screens.
export function SelectBackdrop({ src }: { src: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0 bg-[#0b1111]/70" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 65% at 50% 38%, transparent 0%, rgba(7,11,10,0.92) 100%)",
        }}
      />
    </div>
  );
}
