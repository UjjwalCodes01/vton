import type { Metadata, Viewport } from "next";
import { Caveat, Geist, Geist_Mono } from "next/font/google";
import { CONTACT_EMAIL, SITE_NAME, SITE_TAGLINE, SITE_URL, SOCIALS } from "./_lib/site";
import CookieConsent from "../_shared/CookieConsent";
import ResearchInvite from "./_components/ResearchInvite";
import "./company.css";
import "./pages.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const hand = Caveat({ variable: "--font-hand", subsets: ["latin"], weight: "500", display: "swap" });

export const viewport: Viewport = {
  themeColor: "#faf9f6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  icons: {
    icon: [
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/brand/icon-512.png`,
  description: SITE_TAGLINE,
  email: CONTACT_EMAIL,
  address: {
    "@type": "PostalAddress",
    addressLocality: "New Delhi",
    addressRegion: "Delhi",
    addressCountry: "IN",
  },
  sameAs: SOCIALS.map((s) => s.href),
};

/**
 * Runs before first paint. Adds `fv-motion` only when the visitor has NOT asked for reduced motion, so
 * reduced-motion visitors (and anyone without JS) get the finished, un-pinned, fully visible layout.
 */
const MOTION_BOOT = `if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("fv-motion")`;

export default function CompanyRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${hand.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
        {/* Without JS the reveal classes never arrive, so the hidden state must not apply. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }} />
        {children}
        <ResearchInvite waitForConsent={Boolean(gaId)} />
        <CookieConsent gaId={gaId} />
      </body>
    </html>
  );
}
