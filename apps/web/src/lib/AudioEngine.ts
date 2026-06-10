import { useAudioStore } from "@/stores/audioStore";
import { getTrackPaths, AUDIO_DELAY_MIN_MS, AUDIO_DELAY_MAX_MS } from "@/data/audioTracks";

let ctx: AudioContext | null = null;
let gainNode: GainNode | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let delayTimeout: ReturnType<typeof setTimeout> | null = null;
let storeUnsubscribe: (() => void) | null = null;
let initialized = false;
let unlocked = false;
const bufferCache = new Map<string, AudioBuffer>();

function randomDelay(): number {
  return AUDIO_DELAY_MIN_MS + Math.random() * (AUDIO_DELAY_MAX_MS - AUDIO_DELAY_MIN_MS);
}

function pickRandom(): string {
  const tracks = getTrackPaths();
  return tracks[Math.floor(Math.random() * tracks.length)];
}

function syncVolume() {
  if (!gainNode) return;
  const { musicVolume, isMuted } = useAudioStore.getState();
  gainNode.gain.value = isMuted ? 0 : musicVolume;
}

function stopCurrent() {
  if (delayTimeout) {
    clearTimeout(delayTimeout);
    delayTimeout = null;
  }
  if (currentSource) {
    try { currentSource.stop(); } catch { /* already stopped */ }
    currentSource.disconnect();
    currentSource = null;
  }
}

async function fetchAndDecode(path: string): Promise<AudioBuffer | null> {
  if (!ctx) return null;
  if (bufferCache.has(path)) return bufferCache.get(path)!;
  try {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const arrayBuf = await resp.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuf);
    bufferCache.set(path, buffer);
    return buffer;
  } catch (e) {
    console.warn("[AudioEngine] Failed to load track:", path, e);
    return null;
  }
}

function playBuffer(buffer: AudioBuffer) {
  if (!ctx || !gainNode) return;
  stopCurrent();

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = false;
  source.connect(gainNode);

  source.onended = () => {
    if (currentSource === source) currentSource = null;
    scheduleNext();
  };

  source.start(0);
  currentSource = source;
}

function scheduleNext() {
  delayTimeout = setTimeout(playRandom, randomDelay());
}

async function playRandom() {
  if (!unlocked || !ctx) return;
  stopCurrent();
  const path = pickRandom();
  const buffer = await fetchAndDecode(path);
  if (!buffer) {
    scheduleNext();
    return;
  }
  playBuffer(buffer);
}

function createContext() {
  if (ctx) return;
  ctx = new AudioContext();
  gainNode = ctx.createGain();
  gainNode.connect(ctx.destination);
  syncVolume();
}

function handleUnlockEvent() {
  if (!ctx) createContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().then(() => {
      unlocked = true;
      useAudioStore.getState().unlock();
    });
  } else {
    unlocked = true;
    useAudioStore.getState().unlock();
  }
}

export const AudioEngine = {
  init() {
    if (initialized) return;
    initialized = true;

    const events: Array<keyof HTMLElementEventMap> = ["click", "touchstart", "keydown"];
    for (const evt of events) {
      document.addEventListener(evt, handleUnlockEvent, { once: true });
    }

    // Pause audio when page goes to background (mobile rotation / tab switch / lock screen)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden || document.visibilityState === "hidden") {
        AudioEngine.stop();
        if (ctx && ctx.state === "running") {
          ctx.suspend();
        }
      } else {
        if (ctx && ctx.state === "suspended") {
          ctx.resume().then(() => {
            if (unlocked) AudioEngine.playScene();
          });
        }
      }
    });

    storeUnsubscribe = useAudioStore.subscribe((state, prev) => {
      if (state.musicVolume !== prev.musicVolume || state.isMuted !== prev.isMuted) {
        syncVolume();
      }
    });
  },

  async playScene() {
    if (typeof window === "undefined") return;
    if (!initialized) this.init();
    if (!unlocked) return;
    await playRandom();
  },

  stop() {
    stopCurrent();
  },

  destroy() {
    this.stop();
    storeUnsubscribe?.();
    storeUnsubscribe = null;
    initialized = false;
    unlocked = false;
    bufferCache.clear();
    if (ctx) {
      ctx.close().catch(() => {});
      ctx = null;
      gainNode = null;
    }
  },
};
