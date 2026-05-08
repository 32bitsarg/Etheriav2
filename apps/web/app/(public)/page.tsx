import { HeroSection } from "@/components/landing/HeroSection";
import { LatestVersionSection } from "@/components/landing/LatestVersionSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowToPlaySection } from "@/components/landing/HowToPlaySection";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { ScreenshotsSection } from "@/components/landing/ScreenshotsSection";
import { LoreSection } from "@/components/landing/LoreSection";
import { CtaSection } from "@/components/landing/CtaSection";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <LatestVersionSection />
      <HowToPlaySection />
      <FeaturesSection />
      <SocialProofSection />
      <ScreenshotsSection />
      <LoreSection />
      <CtaSection />
    </>
  );
}