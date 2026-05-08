import { create } from "zustand";

export interface AudioState {
  musicVolume: number;
  isMuted: boolean;
  isUnlocked: boolean;
  lastViewKey: string;
  setMusicVolume: (volume: number) => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  unlock: () => void;
  notifyViewChange: () => void;
}

function loadAudioState(): Pick<AudioState, "musicVolume" | "isMuted"> {
  if (typeof window === "undefined") return { musicVolume: 0.5, isMuted: false };
  try {
    const raw = localStorage.getItem("etheria_audio");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        musicVolume: clamp(parsed.musicVolume ?? 0.5),
        isMuted: parsed.isMuted ?? false,
      };
    }
  } catch {
    /* ignore corrupt */
  }
  return { musicVolume: 0.5, isMuted: false };
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function persist(state: { musicVolume: number; isMuted: boolean }) {
  if (typeof window !== "undefined") {
    localStorage.setItem("etheria_audio", JSON.stringify(state));
  }
}

export const useAudioStore = create<AudioState>((set) => ({
  ...loadAudioState(),
  isUnlocked: false,
  lastViewKey: "",
  unlock: () => set({ isUnlocked: true }),
  notifyViewChange: () => set({ lastViewKey: Date.now().toString() }),
  setMusicVolume: (volume: number) => {
    const clamped = clamp(volume);
    set({ musicVolume: clamped });
    persist({ musicVolume: clamped, isMuted: useAudioStore.getState().isMuted });
  },
  toggleMute: () => {
    set((state) => {
      const next = !state.isMuted;
      persist({ musicVolume: state.musicVolume, isMuted: next });
      return { isMuted: next };
    });
  },
  setMuted: (muted: boolean) => {
    set({ isMuted: muted });
    persist({ musicVolume: useAudioStore.getState().musicVolume, isMuted: muted });
  },
}));
