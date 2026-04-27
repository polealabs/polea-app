import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { TemaProvider } from "@/lib/context/TemaContext";

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
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
  (function() {
    try {
      var tema = localStorage.getItem('polea_tema') || 'bosque';
      var tamano = localStorage.getItem('polea_tamano') || 'normal';
      var temas = {
        bosque: { primary: '#1E3A2F', primaryLight: '#2D4A3E', accent: '#C4622D', accentHover: '#E8845A', accentPale: '#F9EDE5', background: '#FAF6F0', surface: '#FFFFFF', border: '#EDE5DC', text: '#1A1510', textSoft: '#8A7D72', textFaint: '#A09080' },
        oceano: { primary: '#0F2D4A', primaryLight: '#1A3D5C', accent: '#0891B2', accentHover: '#22D3EE', accentPale: '#E0F7FA', background: '#F0F8FF', surface: '#FFFFFF', border: '#BAE6FD', text: '#0C1A2E', textSoft: '#64748B', textFaint: '#7EB8D0' },
        rosa: { primary: '#6B2D4A', primaryLight: '#842D5A', accent: '#DB2777', accentHover: '#EC4899', accentPale: '#FDF2F8', background: '#FFF5F7', surface: '#FFFFFF', border: '#FBCFE8', text: '#3B0764', textSoft: '#9D4F7A', textFaint: '#D4799A' },
        tierra: { primary: '#3D1F0A', primaryLight: '#5C2E0E', accent: '#C2410C', accentHover: '#EA580C', accentPale: '#FFF7ED', background: '#FEFCE8', surface: '#FFFFFF', border: '#FDE68A', text: '#1C0A00', textSoft: '#78350F', textFaint: '#C4924A' },
      };
      var t = temas[tema] || temas.bosque;
      var root = document.documentElement;
      root.style.setProperty('--color-primary', t.primary);
      root.style.setProperty('--color-primary-light', t.primaryLight);
      root.style.setProperty('--color-accent', t.accent);
      root.style.setProperty('--color-accent-hover', t.accentHover);
      root.style.setProperty('--color-accent-pale', t.accentPale);
      root.style.setProperty('--color-background', t.background);
      root.style.setProperty('--color-surface', t.surface);
      root.style.setProperty('--color-border', t.border);
      root.style.setProperty('--color-text', t.text);
      root.style.setProperty('--color-text-soft', t.textSoft);
      root.style.setProperty('--color-text-faint', t.textFaint);
      var sizes = { normal: '15px', grande: '18px' };
      root.style.fontSize = sizes[tamano] || '15px';
    } catch(e) {}
  })();
`,
          }}
        />
      </head>
      <body
        className={`${dmSans.variable} ${fraunces.variable} min-h-full bg-cream text-ink flex flex-col font-sans`}
      >
        <TemaProvider>{children}</TemaProvider>
      </body>
    </html>
  );
}
