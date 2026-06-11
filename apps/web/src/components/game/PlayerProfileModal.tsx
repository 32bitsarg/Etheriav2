"use client";

import { usePublicCityProfile } from "@/hooks/useCity";
import { RaceEmblem } from "@/components/RaceEmblem";
import { useI18n } from "@/i18n";

interface Props {
  cityId: string;
  onClose: () => void;
  onAttack?: (cityId: string, cityName: string) => void;
  onOpenMail?: () => void;
}

export function PlayerProfileModal({ cityId, onClose, onAttack, onOpenMail }: Props) {
  const { t } = useI18n();
  const { data, isLoading } = usePublicCityProfile(cityId);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-etheria-border bg-[#0b1111]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 p-5">
          <h2 className="font-serif text-xl text-etheria-gold-soft">{t("play.profile.title")}</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center p-12 text-white/30 text-sm">
            ...
          </div>
        )}

        {data && (
          <div className="p-5 space-y-4">
            {/* Race + name */}
            <div className="flex items-center gap-4">
              <RaceEmblem race={data.race} className="h-16 w-16 shrink-0" />
              <div>
                <p className="text-lg font-bold text-white">{data.name}</p>
                <p className="text-sm text-white/50">{t(`play.races.${data.race?.toLowerCase?.() ?? "human"}.name`)}</p>
                {data.allianceName && (
                  <p className="mt-1 text-xs text-etheria-gold/70">
                    [{data.allianceTag ?? "?"}] {data.allianceName}
                  </p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/8 bg-white/[0.03] p-3 text-center">
                <p className="text-xs text-white/40">{t("play.profile.power")}</p>
                <p className="text-base font-bold text-white">{data.power.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-white/8 bg-white/[0.03] p-3 text-center">
                <p className="text-xs text-white/40">{t("play.profile.rank")}</p>
                <p className="text-base font-bold text-white">#{data.rank}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              {onAttack && (
                <button
                  onClick={() => { onAttack(data.id, data.name); onClose(); }}
                  className="flex-1 rounded-xl bg-red-900/60 py-3 text-sm font-semibold text-red-200 hover:bg-red-900/80 min-h-[44px]"
                >
                  {t("play.map.attack")}
                </button>
              )}
              {onOpenMail && (
                <button
                  onClick={() => { onOpenMail(); onClose(); }}
                  className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-white/70 hover:bg-white/10 min-h-[44px]"
                >
                  {t("play.mail.compose")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
