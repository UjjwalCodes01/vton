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
import { SHOPIFY_APP_STORE_URL, SITE_NAME, SITE_URL } from "./lib/site";

const DESCRIPTION =
  "Clothsy AI adds AI virtual try-on to Shopify product pages. Shoppers see clothes on themselves before they buy, so you get more conversions and fewer returns.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Clothsy AI – Virtual Try-On for Shopify Fashion Stores",
    template: "%s | Clothsy AI",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Clothsy AI",
    "Clothsy",
    "virtual try-on",
    "AI virtual try-on",
    "Shopify virtual try-on app",
    "virtual fitting room",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: "Clothsy AI – Virtual Try-On for Shopify Fashion Stores",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: "Clothsy AI – Virtual Try-On for Shopify Fashion Stores",
    description: DESCRIPTION,
  },
};

// Structured data naming the product explicitly, so search engines can show
// the site for a "Clothsy AI" query rather than only matching page text.
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Shopify",
  installUrl: SHOPIFY_APP_STORE_URL,
  image: `${SITE_URL}/icon.png`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
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
        <script
          type="application/ld+json"
          // Static, build-time JSON with no user input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
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
