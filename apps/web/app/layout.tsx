import type { Metadata } from "next";
import { Inter, Cinzel, Cinzel_Decorative, Fredoka } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/QueryProvider";
import { I18nClientProvider } from "@/components/I18nClientProvider";
import { MusicController } from "@/components/game/MusicController";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel" });
const cinzelDecorative = Cinzel_Decorative({ subsets: ["latin"], weight: ["400", "700", "900"], variable: "--font-cinzel-decorative" });
const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-fredoka" });

export const metadata: Metadata = {
  title: "Etheria - Strategy Game",
  description: "Build your empire in Etheria",
  icons: {
    icon: "/assets/landing/conquest-of-etheria/logo-conquest-of-etheria-transparent.png",
    shortcut: "/assets/landing/conquest-of-etheria/logo-conquest-of-etheria-transparent.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover" />
      </head>
      <body
        className={`${inter.variable} ${cinzel.variable} ${cinzelDecorative.variable} ${fredoka.variable} ${inter.className} antialiased`}
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
