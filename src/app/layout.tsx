import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JurisLink — Gestion Juridique Intelligente",
  description: "Plateforme de gestion de cabinet juridique. Dossiers, clients, factures, calendrier et plus.",
  keywords: ["JurisLink", "juridique", "cabinet", "avocat", "gestion", "dossiers", "SaaS"],
  authors: [{ name: "JurisLink" }],
  icons: {
    icon: [
      { url: '/icon.png', sizes: '1024x1024', type: 'image/png' },
    ],
    apple: [
      { url: '/icon.png', sizes: '1024x1024', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'JurisLink',
    description: 'Gestion Juridique Intelligente',
    images: ['/splash.png'],
  },
};

/**
 * Root layout — pure server component. ZERO hydration risk.
 *
 * ⚠️  NO ThemeProvider, NO LocaleSync, NO inline <script> here!
 *
 * Why no ThemeProvider in layout.tsx?
 * ─────────────────────────────────
 * In React 19, next-themes ThemeProvider renders a <script> whose `nonce`
 * attribute differs between server (undefined → not rendered) and client
 * ("" → empty string). Since React 19's suppressHydrationWarning only
 * suppresses TEXT mismatches (not ATTRIBUTE mismatches), this causes
 * React error #185 (hydration attribute mismatch).
 *
 * Why no manual <script> for FOUC prevention?
 * ───────────────────────────────────────────
 * React 19 warns: "Scripts inside React components are never executed
 * when rendering on the client." A <script> in the body causes this
 * warning and may have edge-case hydration behavior.
 *
 * Solution:
 * ────────
 * - ThemeProvider and LocaleSync live in AppClient.tsx, which is
 *   dynamically imported AFTER hydration → zero hydration risk.
 * - We set NO className/style on <html> in JSX. The CSS defaults to
 *   light mode via :root styles. ThemeProvider applies the correct
 *   theme from localStorage after mount.
 * - React only checks attributes present in JSX props during hydration.
 *   Since <html> only has lang="fr", React checks nothing else → no mismatch.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
