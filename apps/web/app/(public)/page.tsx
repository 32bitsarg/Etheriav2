import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { ScreenshotsSection } from "@/components/landing/ScreenshotsSection";
import { LoreSection } from "@/components/landing/LoreSection";
import { LatestVersionSection } from "@/components/landing/LatestVersionSection";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <LatestVersionSection />
      <FeaturesSection />
      <ScreenshotsSection />
      <LoreSection />
    </>
  );
}
