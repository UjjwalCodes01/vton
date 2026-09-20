import type { Metadata } from "next";
import Approach from "./_components/Approach";
import Careers from "./_components/Careers";
import Company from "./_components/Company";
import FinalCta from "./_components/FinalCta";
import Footer from "./_components/Footer";
import Hero from "./_components/Hero";
import Journal from "./_components/Journal";
import Motion from "./_components/Motion";
import Nav from "./_components/Nav";
import Product from "./_components/Product";
import Research from "./_components/Research";
import { SITE_NAME, SITE_TAGLINE } from "./_lib/site";

const TITLE = `${SITE_NAME} — building intelligence for the visual world`;
const DESCRIPTION =
  "FabricVTON researches and develops AI systems that understand, generate and transform visual information — from people and products to materials and environments.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: TITLE,
    description: SITE_TAGLINE,
    images: [{ url: "/brand/og.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: SITE_TAGLINE,
    images: ["/brand/og.png"],
  },
};

export default function CompanyHome() {
  return (
    <>
      <a className="fv-skip" href="#main">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <Research />
        <Approach />
        <Product />
        <Journal />
        <Company />
        <Careers />
        <FinalCta />
      </main>
      <Footer />
      <Motion />
    </>
  );
}
