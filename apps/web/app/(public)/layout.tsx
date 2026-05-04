import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-etheria-bg text-etheria-text flex flex-col">
      <LandingNavbar />
      <div className="flex-1 pt-16">{children}</div>
      <LandingFooter />
    </div>
  );
}
