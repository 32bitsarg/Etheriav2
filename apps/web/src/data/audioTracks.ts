const BASE = "/assets/audio/music/";

export const AUDIO_TRACKS = [
  "1. Moonspire.ogg",
  "2. Winds of Valor.ogg",
  "3. Darkwood Path.ogg",
  "4. Frostbound.ogg",
  "5. Emberlight.ogg",
  "6. Silverbrook.ogg",
  "7. Mystic Grove.ogg",
  "8. Throne of Storms.ogg",
  "9. Sorrow\u2019s Edge.ogg",
  "10. Elven Dawn.ogg",
] as const;

export function getTrackPaths(): string[] {
  return AUDIO_TRACKS.map((f) => `${BASE}${encodeURIComponent(f)}`);
}

export const AUDIO_DELAY_MIN_MS = 30_000;
export const AUDIO_DELAY_MAX_MS = 90_000;
