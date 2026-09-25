import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clothsy AI — billing",
  description: "Credits and invoices for your Clothsy AI virtual try-on.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
