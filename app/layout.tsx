import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-dm-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "500", "700"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "POLEA",
  description: "SaaS administrativo para tiendas pequenas colombianas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body
        className={`${dmSans.variable} ${fraunces.variable} min-h-full bg-cream text-ink flex flex-col font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
