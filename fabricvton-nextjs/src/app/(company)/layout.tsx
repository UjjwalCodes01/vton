import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Geist, Geist_Mono } from "next/font/google";
import { CONTACT_EMAIL, SITE_NAME, SITE_TAGLINE, SITE_URL, SOCIALS, isPlaceholder } from "./_lib/site";
import "./company.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1d22" },
  ],
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

/** Only real, non-placeholder profiles go into structured data. */
const sameAs = SOCIALS.filter((s) => !isPlaceholder(s.href) && s.name !== "Email").map((s) => s.href);

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/brand/icon-512.png`,
  description: SITE_TAGLINE,
  ...(isPlaceholder(CONTACT_EMAIL) ? {} : { email: CONTACT_EMAIL }),
  ...(sameAs.length > 0 ? { sameAs } : {}),
};

/**
 * Runs before first paint. Adds `fv-motion` only when the visitor has NOT asked for reduced
 * motion, so reduced-motion visitors (and anyone without JS) get the finished layout.
 */
const MOTION_BOOT = `if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("fv-motion")`;

export default function CompanyRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
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
      </body>
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </html>
  );
}
