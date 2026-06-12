import type { Metadata } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kritik-wine.vercel.app').replace(/\/$/, '')

export const metadata: Metadata = {
  title: "Kritik — Yapay Zeka Destekli İddaa Analizi",
  description: "xG verileri ve sakatlık analizleriyle güçlendirilmiş iddaa tahminleri",
  metadataBase: new URL(SITE_URL),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kritik',
  },
  openGraph: {
    type: 'website',
    siteName: 'Kritik',
    locale: 'tr_TR',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${inter.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <head>
        {process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="min-h-full flex flex-col" style={{ background: "var(--color-base)", color: "var(--color-text-primary)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}',{page_path:window.location.pathname});`}
            </Script>
          </>
        )}
        <Script id="sw-register" strategy="afterInteractive">
          {`if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')`}
        </Script>
        <Navbar />
        <div style={{ flex: 1 }}>
          {children}
        </div>
        <footer style={{
          borderTop: '1px solid var(--color-border)',
          padding: '1.25rem var(--page-pad)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', margin: 0 }}>
            © {new Date().getFullYear()} Kritik · Yalnızca bilgilendirme amaçlıdır
          </p>
          <nav style={{ display: 'flex', gap: '1.25rem' }}>
            {[
              { href: '/kullanim-kosullari', label: 'Kullanım Koşulları' },
              { href: '/gizlilik-politikasi', label: 'Gizlilik Politikası' },
            ].map(l => (
              <a key={l.href} href={l.href} style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', textDecoration: 'none' }}>
                {l.label}
              </a>
            ))}
          </nav>
        </footer>
      </body>
    </html>
  );
}
