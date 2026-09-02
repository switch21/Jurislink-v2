import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <title>JurisLink — Gestion Juridique Intelligente</title>
        <link rel="icon" href="/icon.png" sizes="1024x1024" type="image/png" />
        <meta name="description" content="Plateforme de gestion de cabinet juridique. Dossiers, clients, factures, calendrier et plus." />
        <meta name="keywords" content="JurisLink, juridique, cabinet, avocat, gestion, dossiers, SaaS" />
        <meta name="author" content="JurisLink" />
        <meta property="og:title" content="JurisLink" />
        <meta property="og:description" content="Gestion Juridique Intelligente" />
        <meta property="og:image" content="/splash.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
