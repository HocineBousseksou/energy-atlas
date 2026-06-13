import type { Metadata } from "next";
import { Fraunces, Geist, JetBrains_Mono } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import { SiteHeader } from "@/components/site-header";
import { DemoBadge } from "@/components/ui/demo-badge";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Fraunces — variable display serif with four axes:
 *   opsz (9..144) — optical size; auto-applied at large render sizes
 *   wght (100..900) — weight, auto for variable
 *   ital (0/1) — italic, exposed via `style` array below
 *   SOFT (0..100) — letterform softness (custom axis, must be opt-in)
 *   WONK (0/1) — quirky alternates (custom axis, must be opt-in)
 *
 * Locked-in choice for the wordmark "Atlas": opsz 144 italic wght 500.
 * Rationale: a true italic wins over a CSS-faked italic
 * (Bricolage's transform skew is recognizable at one glance).
 */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Energy Atlas — analyse de la consommation énergétique départementale",
  description:
    "Outil d'aide à la décision énergétique territoriale, open-source, gratuit. Analyse statistique multi-méthodes + explications IA sourcées.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geist.variable} ${jetbrainsMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MotionProvider>
          <SiteHeader />
          {children}
        </MotionProvider>
        <DemoBadge />
      </body>
    </html>
  );
}
