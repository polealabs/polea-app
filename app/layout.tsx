import type { Metadata } from "next";
import { DM_Sans, Fraunces, Space_Grotesk, Rubik } from "next/font/google";
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

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

const rubik = Rubik({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: 'Leva',
  description: 'Tu negocio, sin enredos.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
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
        bosque: { primary: '#1E3A2F', primaryLight: '#2D4A3E', accent: '#4A90D9', accentHover: '#5C9FE0', accentPale: '#E8F2FB', background: '#F4F1EA', surface: '#FFFFFF', border: '#DCD7CA', text: '#16140F', textSoft: '#4A463C', textFaint: '#6E6860' },
        oceano: { primary: '#0F2D4A', primaryLight: '#1A3D5C', accent: '#4A90D9', accentHover: '#5C9FE0', accentPale: '#E8F2FB', background: '#EFF4F9', surface: '#FFFFFF', border: '#C4D8EA', text: '#0C1A2E', textSoft: '#3A5A78', textFaint: '#6A90A8' },
        rosa: { primary: '#6B2D4A', primaryLight: '#842D5A', accent: '#4A90D9', accentHover: '#5C9FE0', accentPale: '#E8F2FB', background: '#F8F3F6', surface: '#FFFFFF', border: '#E4D0DC', text: '#2A1020', textSoft: '#7A4A68', textFaint: '#A87898' },
        tierra: { primary: '#3D1F0A', primaryLight: '#5C2E0E', accent: '#4A90D9', accentHover: '#5C9FE0', accentPale: '#E8F2FB', background: '#F7F3EC', surface: '#FFFFFF', border: '#DDD5C4', text: '#1C0E00', textSoft: '#5A4030', textFaint: '#8A7060' },
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
        className={`${dmSans.variable} ${fraunces.variable} ${spaceGrotesk.variable} ${rubik.variable} min-h-full bg-cream text-ink flex flex-col font-sans`}
      >
        <TemaProvider>{children}</TemaProvider>
      </body>
    </html>
  );
}
