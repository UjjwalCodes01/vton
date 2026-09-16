import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clothsy AI | Virtual try-on for fashion brands",
  description:
    "Clothsy AI brings a realistic virtual fitting room to fashion product pages.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
