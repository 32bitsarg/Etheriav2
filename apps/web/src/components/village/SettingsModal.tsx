"use client";

import { useI18n } from "@/i18n";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";
import { useAudioStore } from "@/stores/audioStore";
import { Modal } from "@/components/ui/Modal";

interface Props {
  onClose: () => void;
}

export function SettingsModal({ onClose }: Props) {
  const { t, locale, setLocale } = useI18n();
  const auth = useMatecitoAuth();
  const { musicVolume, isMuted, setMusicVolume, toggleMute } = useAudioStore();

  const handleLogout = async () => {
    await auth.signOut();
    localStorage.removeItem("etheria_world_id");
    localStorage.removeItem("etheria_pending_race");
    localStorage.removeItem("etheria_pending_city_name");
    setTimeout(() => {
      window.location.replace("/");
    }, 200);
  };

  const options = [
    { code: "es" as const, label: "Español" },
    { code: "en" as const, label: "English" },
  ];

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("play.settings.title")}
      headerGradient="from-stone-700 to-stone-900"
      headerIcon="⚙️"
      size="xs"
    >
      <div className="px-5 py-4 space-y-5">
        {/* Language */}
        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            {t("play.settings.language")}
          </label>
          <div className="flex gap-2">
            {options.map((opt) => (
              <button
                key={opt.code}
                onClick={() => setLocale(opt.code)}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  locale === opt.code
                    ? "border-amber-400/60 bg-amber-50 text-amber-700"
                    : "border-stone-200 text-stone-500 hover:text-stone-700 hover:border-stone-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audio */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              {t("play.settings.audio")}
            </label>
            <button
              onClick={toggleMute}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                isMuted
                  ? "border-red-200 bg-red-50 text-red-500"
                  : "border-stone-200 text-stone-500 hover:text-stone-700"
              }`}
            >
              {isMuted ? t("play.settings.unmute") : t("play.settings.mute")}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">🔈</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
              className="h-1.5 flex-1 appearance-none rounded-full bg-stone-200 accent-amber-500 cursor-pointer"
              disabled={isMuted}
            />
            <span className="text-sm">🔊</span>
          </div>
        </div>

        {/* Logout */}
        <div className="border-t border-stone-100 pt-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-100 hover:text-red-600"
          >
            {t("play.settings.logout")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
