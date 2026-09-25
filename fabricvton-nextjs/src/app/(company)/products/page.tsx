import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { CtaBand } from "../_components/Blocks";
import PageHero from "../_components/PageHero";
import Shell from "../_components/Shell";
import { Arrow } from "../_components/Arrow";
import { PROBLEMS } from "../_content/research";
import { ResearchToProduct, TryOnTask } from "../_figures/Figures";
import { CLOTHSY_URL } from "../_lib/site";
import { delay } from "../_lib/style";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Clothsy AI, FabricVTON's first product: AI virtual try-on for fashion stores, available as a Shopify app and a WooCommerce plugin.",
  alternates: { canonical: "/products" },
};

const SHOPIFY_URL = "https://apps.shopify.com/fabricvton";
const WOO_URL = "https://wordpress.org/plugins/clothsy-ai/";

/** What each open problem means for a shopper using the product. */
const SHOPPER: Record<string, string> = {
  fidelity: "The shirt looks like the shirt: same print, same logo, same colour.",
  drape: "Fit looks believable on this body, not pasted on.",
  consistency: "Every image of the same outfit agrees with the others.",
  speed: "Results arrive while they are still shopping, at a cost a store can afford.",
};

export default function ProductsPage() {
  return (
    <Shell current="/products">
      <PageHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Products" }]}
        eyebrow="PRODUCTS"
        title="Research in the real world."
        lead="Our research becomes useful when it runs in someone’s store. Clothsy AI is our first product."
      />

      <section className="fv-block" aria-labelledby="clothsy-title">
        <div className="fv-wrap fv-feature">
          <div data-reveal>
            <div className="fv-feature-logo">
              <Image src="/brand/clothsy/clothsy-mark.webp" alt="" width={52} height={52} unoptimized />
              <span id="clothsy-title">Clothsy AI</span>
            </div>
            <h2 className="fv-h2">See it on you before you buy it.</h2>
            <p className="fv-lead" style={{ marginTop: 20 }}>
              Clothsy AI is virtual try-on for fashion stores. A shopper uploads one photo and sees the product on
              themselves, right on the product page.
            </p>
            <ul className="fv-bullets">
              <li>
                <strong>Live on Shopify and WooCommerce</strong>, as a Shopify app and a WordPress plugin.
              </li>
              <li>
                <strong>Works with the product photos a store already has.</strong> No new photoshoots or 3D scans.
              </li>
              <li>
                <strong>Private by design.</strong> Shopper photos are never used for training.{" "}
                <Link href="/widget-privacy">Shopper privacy</Link>
              </li>
            </ul>
            <div className="fv-store-links">
              <a className="fv-btn fv-btn--dark" href={CLOTHSY_URL} data-magnet>
                Visit Clothsy AI <Arrow dir="up" />
              </a>
              <a className="fv-btn fv-btn--soft" href={SHOPIFY_URL} target="_blank" rel="noopener noreferrer" data-magnet>
                Shopify App Store <Arrow dir="up" />
              </a>
              <a className="fv-btn fv-btn--soft" href={WOO_URL} target="_blank" rel="noopener noreferrer" data-magnet>
                WordPress.org <Arrow dir="up" />
              </a>
            </div>
          </div>
          <div className="fv-feature-media" data-reveal style={delay(100)}>
            <Image
              src="/brand/clothsy-powered-by.webp"
              alt="Clothsy AI, powered by FabricVTON"
              width={1000}
              height={601}
              sizes="(max-width: 899px) 90vw, 560px"
              unoptimized
            />
          </div>
        </div>
      </section>

      <section className="fv-block fv-block--panel" aria-labelledby="how-title">
        <div className="fv-wrap">
          <div className="fv-block-head">
            <div data-reveal>
              <p className="fv-eyebrow">HOW IT WORKS</p>
              <h2 className="fv-h2" id="how-title">
                One photo in, the product on you out.
              </h2>
            </div>
            <p className="fv-lead" data-reveal style={delay(80)}>
              Behind the button is the task our research team works on every day: keep the person, take the product, and
              generate an image that is faithful to both.
            </p>
          </div>
          <div data-reveal>
            <TryOnTask />
          </div>
        </div>
      </section>

      <section className="fv-block" aria-labelledby="bridge-title">
        <div className="fv-wrap fv-two">
          <div data-reveal>
            <p className="fv-eyebrow">WHY THE RESEARCH MATTERS</p>
            <h2 className="fv-h2" id="bridge-title">
              Every open problem is something a shopper would notice.
            </h2>
            <Link className="fv-textlink" href="/research/open-problems" data-magnet>
              The open problems <Arrow />
            </Link>
          </div>
          <ol className="fv-rules">
            {PROBLEMS.map((p, i) => (
              <li key={p.slug} data-reveal style={delay(i * 60)}>
                <div>
                  <h3>{p.title}</h3>
                  <p>{SHOPPER[p.slug]}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="fv-wrap" style={{ marginTop: "clamp(48px, 7vw, 88px)" }} data-reveal>
          <ResearchToProduct />
        </div>
      </section>

      <section className="fv-block fv-block--beige fv-block--line" aria-labelledby="next-title">
        <div className="fv-wrap fv-two">
          <div data-reveal>
            <p className="fv-eyebrow">WHAT’S NEXT</p>
            <h2 className="fv-h2" id="next-title">
              More from the same research.
            </h2>
          </div>
          <p className="fv-lead" data-reveal style={delay(80)}>
            The same understanding of people, materials and objects applies well beyond one product. When there is
            something new to show, it will be here first.
          </p>
        </div>
      </section>

      <CtaBand eyebrow="FOR BUSINESSES" title="Want virtual try-on for your store?" text="Install Clothsy AI on Shopify or WooCommerce, or talk to us about your catalogue."
        primary={{ label: "Visit Clothsy AI", href: CLOTHSY_URL, external: true }}
      />
    </Shell>
  );
}
