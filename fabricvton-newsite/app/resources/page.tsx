import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Sparkle } from "../components/icons";
import { GUIDES } from "../lib/content";
import { BOOK_DEMO_URL, CONTACT_HREF, LEGAL } from "../lib/site";
import GuideGrid from "./GuideGrid";

export const metadata: Metadata = {
  title: "Resources",
  description: "Guides for shoppers and stores: taking a photo that works, what happens to your photo, and setting up Clothsy on Shopify or WooCommerce.",
  alternates: { canonical: "/resources" },
};

const featured = GUIDES[0];

export default function ResourcesPage() {
  return (
    <main id="main" tabIndex={-1}>
      {/* ---------------- hero ---------------- */}
      <section className="res-hero">
        <div className="shell res-hero-inner">
          <div>
            <p className="eyebrow">Resources</p>
            <h1 className="display">
              Learn. Build. Grow
              <br />
              <em>with Clothsy AI.</em>
            </h1>
            <p className="lede">Guides and answers to help shoppers get a great try-on, and help stores set Clothsy up.</p>
            <Link className="btn btn-ghost" href="#guides" style={{ marginTop: "32px" }}>
              Explore Resources <ArrowRight className="btn-arrow" />
            </Link>

            <div className="topic-chips">
              {["Shopper guides", "Store setup", "Privacy", "Plans"].map((topic) => (
                <span key={topic}>
                  <Sparkle /> {topic}
                </span>
              ))}
            </div>
          </div>

          <div className="res-hero-art">
            <Image
              src="/resource_hero.png"
              alt="Cards for guides, expert insights, industry trends and product updates"
              width={1712}
              height={919}
              sizes="(max-width: 900px) 100vw, 55vw"
              priority
            />
          </div>
        </div>
      </section>

      {/* ---------------- featured ---------------- */}
      <section className="section featured-section" id="featured">
        <div className="shell featured">
          <div className="featured-copy" data-reveal>
            <p className="eyebrow">Featured guide</p>
            <h2 className="display">
              A good try-on starts
              <br />
              <em>with a good photo.</em>
            </h2>
            <p className="lede">Stand upright, face the camera, keep your shoulders in frame. A few small things make the difference between a look you love and one you retake.</p>
            <Link className="btn btn-dark" href={`/resources/${featured.slug}`} style={{ marginTop: "30px" }}>
              Read the guide <ArrowRight className="btn-arrow" />
            </Link>
          </div>

          <article className="featured-card" data-reveal>
            <figure>
              <Image src="/story-editorial.jpg" alt="A model photographed in a dark editorial setting" width={722} height={900} sizes="(max-width: 900px) 100vw, 26vw" />
            </figure>
            <div>
              <h3>{featured.title}</h3>
              <p>{featured.summary}</p>
              <Link className="link-arrow" href={`/resources/${featured.slug}`}>
                Read the guide
                <span>
                  <ArrowRight />
                </span>
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* ---------------- guides ---------------- */}
      <section className="section" id="guides" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div className="section-head">
            <h2 className="display">Guides</h2>
          </div>
          <GuideGrid guides={GUIDES} />
        </div>
      </section>

      {/* ---------------- customer stories ---------------- */}
      <section className="section" id="stories">
        <div className="shell stories">
          <div>
            <p className="eyebrow">Customer stories</p>
            <h2 className="display">
              Stories from
              <br />
              stores.
            </h2>
            <p className="lede">Stores using Clothsy will share how it fits into their shop, in their own words.</p>
          </div>

          <div className="story-rail">
            <article className="story-card story-empty">
              <span className="story-brand">Your store could be first.</span>
              <p>Using Clothsy, or thinking about it? Tell us how it&apos;s going, or ask us anything.</p>
              <footer>
                <a className="btn btn-ghost btn-sm" href={CONTACT_HREF}>
                  Share your story <ArrowRight className="btn-arrow" />
                </a>
              </footer>
            </article>
          </div>
        </div>
      </section>

      {/* ---------------- help ---------------- */}
      <section className="section" id="help" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div className="help-panel">
            <div>
              <h2 className="display">
                Need help?
                <br />
                We’re here for you.
              </h2>
              <p className="lede">Read a guide, or write to us and we will get back to you.</p>
              <div className="cta-actions">
                <a className="btn btn-ghost" href={CONTACT_HREF}>
                  Email us <ArrowRight className="btn-arrow" />
                </a>
                <a className="btn btn-ghost" href={BOOK_DEMO_URL} target="_blank" rel="noopener noreferrer">
                  Book a demo <ArrowUpRight className="btn-arrow" />
                </a>
              </div>
              <p className="help-legal">
                <a href={LEGAL.shopperPrivacy} target="_blank" rel="noopener noreferrer">
                  Shopper privacy
                </a>
                <a href={LEGAL.privacy} target="_blank" rel="noopener noreferrer">
                  Privacy policy
                </a>
                <a href={LEGAL.terms} target="_blank" rel="noopener noreferrer">
                  Terms
                </a>
              </p>
            </div>

            <div className="help-visual">
              <Image
                src="/resourcegil.png"
                alt="Help topics: getting started, integration guide, troubleshooting and contacting support"
                width={2070}
                height={760}
                sizes="(max-width: 900px) 100vw, 52vw"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
