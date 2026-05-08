"use client";

import { I18nProvider } from "@/i18n";
import { GameInitializer } from "@/components/game/GameInitializer";
import { GameNotificationWatcher } from "@/components/game/GameNotificationWatcher";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { VillageView } from "@/components/village/VillageView";

export default function PlayPage() {
  return (
    <I18nProvider>
      <main className="relative h-screen w-screen overflow-hidden bg-etheria-bg">
        <GameInitializer />
        <GameNotificationWatcher />
        <ToastContainer />
        <VillageView />
      </main>
    </I18nProvider>
  );
}
