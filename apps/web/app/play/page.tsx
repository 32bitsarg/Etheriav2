"use client";

import { I18nProvider } from "@/i18n";
import { GameInitializer } from "@/components/game/GameInitializer";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { VillageView } from "@/components/village/VillageView";

export default function PlayPage() {
  return (
    <I18nProvider>
      <main className="relative h-screen w-screen overflow-hidden bg-etheria-bg">
        <GameInitializer />
        <ToastContainer />
        <VillageView />
      </main>
    </I18nProvider>
  );
}
