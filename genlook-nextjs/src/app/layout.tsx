import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "FabricVTON - AI Virtual Try-On for Shopify",
  description:
    "FabricVTON helps Shopify merchants offer AI-powered virtual try-on with a premium storefront experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="icon" href="/fabricvton.png" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
