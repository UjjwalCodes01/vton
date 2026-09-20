import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import SiteNav from "./components/SiteNav";
import SiteFooter from "./components/SiteFooter";

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

export const metadata: Metadata = {
  title: "Clothsy AI | See yourself in every outfit",
  description:
    "Clothsy AI brings a realistic virtual fitting room to your product pages. Shoppers upload a photo and see themselves in the outfit before they buy.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <SiteNav />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
