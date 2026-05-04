import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0c0a09]">
      <LandingNavbar />
      <div className="flex-1 pt-16">
        {children}
      </div>
      <LandingFooter />
    </div>
  );
}
