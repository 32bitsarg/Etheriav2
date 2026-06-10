"use client";

import { I18nProvider } from "@/i18n";
import { GameInitializer } from "@/components/game/GameInitializer";
import { GameNotificationWatcher } from "@/components/game/GameNotificationWatcher";
import { CityDataSync } from "@/components/game/CityDataSync";
import { UpdateNotifier } from "@/components/game/UpdateNotifier";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { VillageView } from "@/components/village/VillageView";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";
import { useGameStore } from "@/stores/gameStore";

function PlayContent() {
  const auth = useMatecitoAuth();
  const cityId = useGameStore((s) => s.cityId);
  const canMountGame = auth.ready && auth.isLoggedIn && !!cityId;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-etheria-bg">
      <GameInitializer />
      {canMountGame && (
        <>
          <GameNotificationWatcher />
          <CityDataSync />
          <VillageView />
        </>
      )}
      <UpdateNotifier />
      <ToastContainer />
    </main>
  );
}

export default function PlayPage() {
  return (
    <I18nProvider>
      <PlayContent />
    </I18nProvider>
  );
}
