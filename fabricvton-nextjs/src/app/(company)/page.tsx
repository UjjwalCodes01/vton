import type { Metadata } from "next";
import Clothsy from "./_components/Clothsy";
import Collaborate from "./_components/Collaborate";
import Evidence from "./_components/Evidence";
import Footer from "./_components/Footer";
import Hero from "./_components/Hero";
import Journal from "./_components/Journal";
import Motion from "./_components/Motion";
import Nav from "./_components/Nav";
import Research from "./_components/Research";
import Team from "./_components/Team";
import { SHOW_JOURNAL, SITE_NAME } from "./_lib/site";

const TITLE = "FabricVTON — AI that understands fabric";
const DESCRIPTION =
  "FabricVTON researches how fabric drapes, stretches and holds its detail, and builds visual AI that gets it right. Clothsy AI is our virtual try-on product for fashion stores.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    // [OG_IMAGE] — replace with artwork made for sharing; this is the logo lockup on the page background.
    images: [{ url: "/brand/og.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
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
        <Evidence />
        <Clothsy />
        {SHOW_JOURNAL ? <Journal /> : null}
        <Team />
        <Collaborate />
      </main>
      <Footer />
      <Motion />
    </>
  );
}
