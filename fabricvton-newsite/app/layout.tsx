import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import "./styles/flow.css";
import "./styles/widget.css";
import "./styles/sections.css";
import SiteNav from "./components/SiteNav";
import SiteFooter from "./components/SiteFooter";
import Motion from "./components/motion/Motion";
import { PARENT_URL, SITE_NAME, SITE_URL, SOCIALS } from "./lib/site";

const display = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const TITLE = "Clothsy AI | See yourself in every outfit";
const DESCRIPTION =
  "Clothsy AI puts a virtual fitting room on the product page. Shoppers add a photo and see themselves in the outfit before they buy.";

export const viewport: Viewport = {
  themeColor: "#faf7f3",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: `%s | ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    images: [{ url: "/mantryon-cutout.png", width: 1536, height: 1024, alt: "The same person in his own photo and in an AI try-on" }],
  },
  twitter: { card: "summary_large_image", site: "@clothsyai", title: TITLE, description: DESCRIPTION, images: ["/mantryon-cutout.png"] },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: "BusinessApplication",
  publisher: { "@type": "Organization", name: "FabricVTON", url: PARENT_URL },
  sameAs: SOCIALS.map((social) => social.href),
};

/** Adds html.motion only when the visitor has not asked for reduced motion. Without it every section renders finished. */
const MOTION_BOOT = "if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('motion')";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
        <a className="skip" href="#main">
          Skip to content
        </a>
        <SiteNav />
        {children}
        <SiteFooter />
        <Motion />
      </body>
    </html>
  );
}
