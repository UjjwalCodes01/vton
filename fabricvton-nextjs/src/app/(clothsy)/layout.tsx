import type { Metadata, Viewport } from "next";
import CookieConsent from "../_shared/CookieConsent";
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
import SmoothScroll from "./components/SmoothScroll";
import PwaManager from "./components/pwa/PwaManager";
import MobileBottomNav from "./components/pwa/MobileBottomNav";
import { Toaster } from "sonner";
import { SHOPIFY_APP_STORE_URL, SITE_NAME, SITE_URL } from "./lib/site";

const TITLE = "Clothsy AI (FabricVTON) - AI-Powered Virtual Try-On";
const DESCRIPTION =
  "AI-powered virtual try-on for fashion stores and shoppers. Boost conversions, cut returns, and experience realistic digital fitting.";

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: `%s | ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: "Clothsy AI",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Clothsy AI",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: { type: "website", siteName: SITE_NAME, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Clothsy AI",
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Shopify, iOS, Android, Web",
  installUrl: SHOPIFY_APP_STORE_URL,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
      </head>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <SmoothScroll>
          <div className="app-content-wrapper">
            {children}
            <Footer />
          </div>
        </SmoothScroll>
        <MobileBottomNav />
        <PwaManager />
        <Toaster position="bottom-right" richColors />
        <CookieConsent gaId={gaId} aboveBottomNav />
      </body>
    </html>
  );
}
