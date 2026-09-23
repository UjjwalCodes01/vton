import Image from "next/image";
import Link from "next/link";
import HeroVisual from "./components/HeroVisual";
import HowFlow from "./components/HowFlow";
import { ArrowRight, ArrowUpRight, Bag, Eye, Wand } from "./components/icons";
import StoreDemo from "./components/StoreDemo";
import WatchDemo from "./components/WatchDemo";
import { BOOK_DEMO_URL, SHOPIFY_URL, WOO_URL } from "./lib/site";

const points = [
  { icon: <Wand />, label: "AI Powered" },
  { icon: <Eye />, label: "Realistic Results" },
  { icon: <Bag />, label: "Shop Smarter" },
];

export default function Home() {
  return (
    <main id="main" tabIndex={-1}>
      {/* ---------------- hero ---------------- */}
      <section className="hero" id="top">
        <div className="hero-bg" />
        <div className="shell hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">Your style. Reimagined.</p>
            <h1 className="display">
              See Yourself
              <br />
              In <em>Every Outfit.</em>
            </h1>
            <p className="lede">
              Try on clothes virtually with AI. Upload a photo, explore new styles, and shop with
              confidence — all in one place.
            </p>

            <div className="hero-ctas">
              <Link className="btn btn-dark" href="#demo">
                Try Now <ArrowRight className="btn-arrow" />
              </Link>
              <WatchDemo />
            </div>
            <p className="hero-platforms">
              Works with{" "}
              <a href={SHOPIFY_URL} target="_blank" rel="noopener noreferrer">
                Shopify
              </a>{" "}
              and{" "}
              <a href={WOO_URL} target="_blank" rel="noopener noreferrer">
                WooCommerce
              </a>
            </p>
          </div>

          <div className="hero-art">
            <HeroVisual />
          </div>
        </div>

        <Link className="scroll-cue" href="#about">
          <span>
            <ArrowRight />
          </span>
          Scroll to explore
        </Link>
      </section>

      {/* ---------------- about ---------------- */}
      <section className="section about-section" id="about">
        <div className="shell about">
          <div className="about-visual">
            <Image
              src="/mantryon-cutout.png"
              alt="Before and after: the same model shown in his own photo and in an AI-generated try-on"
              width={1536}
              height={1024}
              sizes="(max-width: 900px) 100vw, 56vw"
            />
          </div>

          <div className="about-copy">
            <p className="eyebrow eyebrow-violet">/ About Clothsy</p>
            <h2 className="display">Fashion Without Limits.</h2>
            <p className="lede">
              Clothsy AI helps shoppers see how clothes look on them before they buy. Powered by
              advanced AI, it brings the fitting room to every product page — anytime, anywhere.
            </p>
            <p className="lede">
              One photo is all it takes. Clothsy places the garment on the shopper’s own photo, so
              they can see how a piece could look on them. Results can vary depending on the photo
              and the garment.
            </p>
            <p className="lede">
              It works with the product photos you already have. No new photoshoots, no 3D scans, no
              apps to download — just a button on the page your shoppers are already looking at.
            </p>
            <Link className="btn btn-dark" href="#try">
              Get Started <ArrowRight className="btn-arrow" />
            </Link>

            <div className="about-points">
              {points.map((point) => (
                <div key={point.label}>
                  <span className="icon-chip">{point.icon}</span>
                  <b>{point.label}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- how it works (interactive) ---------------- */}
      <HowFlow />

      {/* ---------------- for stores: the button, in your colours ---------------- */}
      <section className="section store" id="stores" aria-labelledby="stores-title">
        <div className="shell">
          <div className="store-head" data-reveal>
            <p className="eyebrow eyebrow-violet">For stores</p>
            <h2 className="display" id="stores-title">
              It lives on
              <br />
              your product page.
            </h2>
            <p className="lede">
              The Try it on button sits beside Add to cart, in your colours. Change it below to see
              how it takes on your store.
            </p>
          </div>

          <div data-reveal>
            <StoreDemo />
          </div>
        </div>
      </section>

      {/* ---------------- closing cta ---------------- */}
      <section className="section" id="try" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div className="cta-panel">
            <div className="cta-copy">
              <p className="eyebrow">Let’s build together</p>
              <h2 className="display">
                Bring your products
                <br />
                to life with <em>Clothsy AI.</em>
              </h2>
              <p className="lede">
                Empowering brands and creators with seamless, beautiful virtual fitting technology.
              </p>
              <div className="cta-actions">
                <a className="btn btn-violet" href={SHOPIFY_URL} target="_blank" rel="noopener noreferrer">
                  Install on Shopify <ArrowRight className="btn-arrow" />
                </a>
                <a className="btn btn-ghost" href={BOOK_DEMO_URL} target="_blank" rel="noopener noreferrer">
                  Book a demo <ArrowUpRight className="btn-arrow" />
                </a>
              </div>
              <p className="cta-note">
                Free to install. Every store starts with 15 try-ons a month.{" "}
                <a href={WOO_URL} target="_blank" rel="noopener noreferrer" className="cta-link">
                  Also on WooCommerce
                </a>
                .
              </p>
            </div>

            <div className="cta-visual">
              <Image
                src="/cta-model.png"
                alt="A model carrying a lilac handbag"
                width={924}
                height={724}
                sizes="(max-width: 900px) 100vw, 42vw"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
