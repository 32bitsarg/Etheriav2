import type { Metadata } from "next";
import { Inter, Cinzel, Cinzel_Decorative } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/QueryProvider";
import { I18nClientProvider } from "@/components/I18nClientProvider";
import { MusicController } from "@/components/game/MusicController";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel" });
const cinzelDecorative = Cinzel_Decorative({ subsets: ["latin"], weight: ["400", "700", "900"], variable: "--font-cinzel-decorative" });

export const metadata: Metadata = {
  title: "Etheria - Strategy Game",
  description: "Build your empire in Etheria",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${cinzel.variable} ${cinzelDecorative.variable} ${inter.className} antialiased`}
        style={{ backgroundColor: "#fafaf9", color: "#1c1917" }}
      >
        <QueryProvider>
          <I18nClientProvider>
            <MusicController />
            {children}
          </I18nClientProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
