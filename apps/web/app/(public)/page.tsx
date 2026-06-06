import { HeroSection } from "@/components/landing/HeroSection";
import { LatestVersionSection } from "@/components/landing/LatestVersionSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { LoreSection } from "@/components/landing/LoreSection";
import { HowToPlaySection } from "@/components/landing/HowToPlaySection";
import { CtaSection } from "@/components/landing/CtaSection";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <LatestVersionSection />
      <FeaturesSection />
      <LoreSection />
      <HowToPlaySection />
      <CtaSection />
    </>
  );
}
