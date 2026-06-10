"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { getPublicRelease } from "@/lib/changelogPublic";
import { useI18n } from "@/i18n";

const CURRENT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
const CURRENT_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || null;
// In dev the baked sha and the last-generated version.json drift constantly;
// only compare build ids on production builds.
const COMPARE_BUILD_ID = process.env.NODE_ENV === "production" && !!CURRENT_BUILD_ID;
const POLL_INTERVAL_MS = 90_000;
const LAST_SEEN_KEY = "etheria_last_seen_version";
const CHUNK_RELOAD_KEY = "etheria_chunk_reload_at";

function isChunkLoadError(message: string): boolean {
  return /ChunkLoadError|Loading chunk \S+ failed|Failed to fetch dynamically imported module/i.test(message);
}

/**
 * Mounted in /play. Three jobs:
 * 1. Polls /version.json (no-store) and shows a persistent "update available"
 *    banner when a new deploy lands. Updating is just a hard reload: Next.js
 *    chunks are content-hashed, so the browser fetches everything fresh.
 * 2. Shows a "what's new" modal once per version after the player loads
 *    an updated client.
 * 3. Auto-recovers (one guarded reload) when a stale client hits a
 *    ChunkLoadError after a deploy removed its old chunks.
 */
export function UpdateNotifier() {
  const { t } = useI18n();
  const [remote, setRemote] = useState<{ version: string; buildId: string | null } | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { version?: string; buildId?: string | null };
      if (typeof data.version === "string" && data.version.length > 0) {
        setRemote({ version: data.version, buildId: data.buildId ?? null });
      }
    } catch {
      // offline or deploy in progress: try again on the next tick
    }
  }, []);

  // Poll while the tab is visible; check immediately when it becomes visible again
  useEffect(() => {
    void checkVersion();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void checkVersion();
    }, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkVersion();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [checkVersion]);

  // What's new: show once per version, but never on a player's first visit
  useEffect(() => {
    const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
    if (lastSeen && lastSeen !== CURRENT_VERSION && getPublicRelease(CURRENT_VERSION)) {
      setWhatsNewOpen(true);
    }
    localStorage.setItem(LAST_SEEN_KEY, CURRENT_VERSION);
  }, []);

  // A deploy can delete the chunks this client still references; reload once to resync
  useEffect(() => {
    const maybeReload = (message: string) => {
      if (!isChunkLoadError(message)) return;
      const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0);
      if (Date.now() - last < 60_000) return;
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
      window.location.reload();
    };
    const onError = (e: ErrorEvent) => maybeReload(e.message ?? "");
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      maybeReload(typeof reason === "string" ? reason : (reason?.message ?? String(reason ?? "")));
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  const updateAvailable =
    remote !== null &&
    (remote.version !== CURRENT_VERSION ||
      (COMPARE_BUILD_ID && !!remote.buildId && remote.buildId !== CURRENT_BUILD_ID)) &&
    `${remote.version}|${remote.buildId}` !== dismissedKey;

  const release = getPublicRelease(CURRENT_VERSION);

  return (
    <>
      {updateAvailable && (
        <div className="fixed left-1/2 top-3 z-[90] w-[min(94vw,26rem)] -translate-x-1/2 animate-toast-in">
          <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/95 shadow-lg shadow-stone-900/10 backdrop-blur-xl">
            <div className="h-0.5 bg-amber-500" />
            <div className="flex items-center gap-3 p-3.5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/10">
                <img
                  src="/assets/ui/notifications/quest.png"
                  alt=""
                  className="h-8 w-8 object-contain"
                  draggable={false}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-amber-800">{t("update.available")}</p>
                <p className="text-[12.5px] leading-snug text-amber-700">
                  {t("update.description").replace("{version}", remote?.version ?? "")}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-full bg-amber-500 px-4 py-1.5 text-[12.5px] font-bold text-white shadow-sm transition-colors hover:bg-amber-600"
                >
                  {t("update.button")}
                </button>
                <button
                  onClick={() => setDismissedKey(`${remote?.version}|${remote?.buildId}`)}
                  className="rounded-full px-4 py-1 text-[11.5px] font-semibold text-amber-700/80 transition-colors hover:text-amber-800"
                >
                  {t("update.later")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {release && (
        <Modal
          isOpen={whatsNewOpen}
          onClose={() => setWhatsNewOpen(false)}
          title={t("update.whatsNewTitle")}
          subtitle={`${t(release.nameKey)} · v${release.version}`}
          headerGradient="from-amber-500 to-orange-500"
          size="md"
        >
          <div className="space-y-4 p-1">
            {release.sections.map((section) => (
              <div key={section.heading}>
                <h4 className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-amber-600">
                  {t(`changelog.headings.${section.heading}`)}
                </h4>
                <ul className="space-y-1.5">
                  {section.itemKeys.map((itemKey) => (
                    <li key={itemKey} className="flex gap-2 text-[13px] text-stone-600">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      <span>{t(itemKey)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <button
              onClick={() => setWhatsNewOpen(false)}
              className="mt-2 w-full rounded-full bg-amber-500 py-2.5 text-[14px] font-bold text-white shadow-sm transition-colors hover:bg-amber-600"
            >
              {t("update.whatsNewClose")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
