import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { I18nClientProvider } from "@/components/I18nClientProvider";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <I18nClientProvider>
      <div className="flex min-h-screen flex-col" style={{ background: "#fdf7ee" }}>
        <LandingNavbar />
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
        <LandingFooter />
      </div>
    </I18nClientProvider>
  );
}
