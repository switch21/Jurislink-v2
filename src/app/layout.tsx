import "./globals.css";

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
        <link rel="apple-touch-icon" href="/icon.png" sizes="1024x1024" />
        <meta name="description" content="Plateforme de gestion de cabinet juridique. Dossiers, clients, factures, calendrier et plus." />
        <meta name="keywords" content="JurisLink, juridique, cabinet, avocat, gestion, dossiers, SaaS" />
        <meta property="og:title" content="JurisLink" />
        <meta property="og:description" content="Gestion Juridique Intelligente" />
        <meta property="og:image" content="/splash.png" />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
