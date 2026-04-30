import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: "FabricVTON - AI-Powered Virtual Try-On for Shopify",
  description:
    "AI-powered virtual try-on for Shopify fashion stores. Boost conversions, cut returns.",
};

import SmoothScroll from "./components/SmoothScroll";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <SmoothScroll>
          {children}
          <Footer />
        </SmoothScroll>
        <Toaster position="bottom-right" richColors />
      </body>
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </html>
  );
}
