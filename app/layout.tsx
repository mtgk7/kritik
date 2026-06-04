import type { Metadata } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Kritik — Yapay Zeka Destekli İddaa Analizi",
  description: "xG verileri ve sakatlık analizleriyle güçlendirilmiş iddaa tahminleri",
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
      <body className="min-h-full flex flex-col" style={{ background: "var(--color-base)", color: "var(--color-text-primary)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
