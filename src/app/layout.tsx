import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppMount } from "./AppMount";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning>
        {children}
        <AppMount />
      </body>
    </html>
  );
}
