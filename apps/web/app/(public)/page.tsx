import { HeroSection } from "@/components/landing/HeroSection";
import { ChangelogSection } from "@/components/landing/ChangelogSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { LoreSection } from "@/components/landing/LoreSection";
import { HowToPlaySection } from "@/components/landing/HowToPlaySection";
import { CtaSection } from "@/components/landing/CtaSection";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ChangelogSection />
      <FeaturesSection />
      <LoreSection />
      <HowToPlaySection />
      <CtaSection />
    </>
  );
}
