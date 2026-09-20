import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkle } from "../components/icons";
import NewsletterForm from "./NewsletterForm";

export const metadata: Metadata = {
  title: "Resources | Clothsy AI",
  description:
    "Guides, research, customer stories and product updates on virtual try-on and AI in fashion.",
};

const posts = [
  {
    tag: "Product",
    date: "Sep 12, 2026",
    dateTime: "2026-09-12",
    title: "How Virtual Try-On is Redefining Online Fashion",
    copy: "Discover how AI is changing the way people shop for clothes online.",
    image: "/story-street.jpg",
    alt: "A shopper in a patterned coat and hat on a city street",
  },
  {
    tag: "Insights",
    date: "Sep 8, 2026",
    dateTime: "2026-09-08",
    title: "5 Ways Fashion Brands Can Increase Conversions with AI",
    copy: "Practical strategies to boost engagement and reduce return rates.",
    image: "/story-runway.jpg",
    alt: "A model walking a runway show",
  },
  {
    tag: "Updates",
    date: "Sep 1, 2026",
    dateTime: "2026-09-01",
    title: "Introducing Smarter Try-Ons and Faster Generations",
    copy: "New features, better quality, and a smoother experience — now live.",
    image: "/story-fabric.jpg",
    alt: "A Clothsy hang tag resting on folded cream fabric",
  },
];

const stories = [
  {
    brand: "Zyla",
    quote: "Shoppers finally know what a piece looks like on them before it reaches the basket.",
    name: "Priya S.",
    role: "Founder, Zyla",
  },
  {
    brand: "Nuura",
    quote: "Easy integration, beautiful results. It’s become part of how we launch every drop.",
    name: "Arjun M.",
    role: "Head of E-commerce",
  },
  {
    brand: "Vellé",
    quote: "Fewer size questions in our inbox, and a product page people actually play with.",
    name: "Sneha T.",
    role: "Co-founder, Vellé",
  },
];

export default function ResourcesPage() {
  return (
    <main>
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
            <p className="lede">
              Guides, research, stories and tools to help you make the most of virtual try-on and AI
              in fashion.
            </p>
            <Link className="btn btn-ghost" href="#blog" style={{ marginTop: "32px" }}>
              Explore Resources <ArrowRight className="btn-arrow" />
            </Link>

            <div className="topic-chips">
              {["Guides", "Case studies", "Industry trends", "Product updates", "API docs"].map(
                (topic) => (
                  <span key={topic}>
                    <Sparkle /> {topic}
                  </span>
                ),
              )}
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
          <div className="featured-copy">
            <p className="eyebrow">Featured</p>
            <h2 className="display">
              The future of fashion
              <br />
              <em>is personal.</em>
            </h2>
            <p className="lede">
              Explore in-depth guides, research, and behind-the-scenes stories shaping the next
              generation of fashion.
            </p>
            <p className="lede">
              How shoppers really use a fitting room on a phone. What changes when a product page
              answers “will this suit me?” before the basket. Where the technology is heading next,
              written by the people building it.
            </p>
            <Link className="btn btn-dark" href="#blog" style={{ marginTop: "30px" }}>
              Read our story <ArrowRight className="btn-arrow" />
            </Link>
          </div>

          <article className="featured-card">
            <figure>
              <Image
                src="/story-editorial.jpg"
                alt="A model photographed in a dark editorial setting"
                width={722}
                height={900}
                sizes="(max-width: 900px) 100vw, 26vw"
              />
            </figure>
            <div>
              <h3>From Ideas to Outfits</h3>
              <p>
                A behind-the-scenes look at how Clothsy AI is building a more inclusive fashion
                future.
              </p>
              <Link className="link-arrow" href="#blog">
                Read the story
                <span>
                  <ArrowRight />
                </span>
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* ---------------- blog ---------------- */}
      <section className="section" id="blog" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div className="section-head">
            <h2 className="display">Latest from the Blog</h2>
            <Link className="link-arrow" href="#blog">
              View all posts
              <span>
                <ArrowRight />
              </span>
            </Link>
          </div>

          <div className="post-grid">
            {posts.map((post) => (
              <article className="post-card" key={post.title}>
                <figure>
                  <Image
                    src={post.image}
                    alt={post.alt}
                    width={900}
                    height={600}
                    sizes="(max-width: 680px) 100vw, (max-width: 1100px) 45vw, 30vw"
                  />
                </figure>
                <div className="post-body">
                  <div className="post-meta">
                    <span className="tag">{post.tag}</span>
                    <time dateTime={post.dateTime}>{post.date}</time>
                  </div>
                  <h3>{post.title}</h3>
                  <p>{post.copy}</p>
                  <Link className="link-arrow" href="#blog" aria-label={`Read: ${post.title}`}>
                    <span>
                      <ArrowRight />
                    </span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- customer stories ---------------- */}
      <section className="section" id="stories">
        <div className="shell stories">
          <div>
            <p className="eyebrow">Customer stories</p>
            <h2 className="display">
              Real brands.
              <br />
              Real results.
            </h2>
            <p className="lede">
              See how fashion brands and creators are using Clothsy AI to build better shopping
              experiences.
            </p>
            <Link className="btn btn-ghost btn-sm" href="#stories" style={{ marginTop: "28px" }}>
              Read more stories <ArrowRight className="btn-arrow" />
            </Link>
          </div>

          <div className="story-grid">
            {stories.map((story) => (
              <article className="story-card" key={story.brand}>
                <span className="story-brand">{story.brand}</span>
                <p>“{story.quote}”</p>
                <footer>
                  <span className="avatar">
                    {story.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </span>
                  <div>
                    <b>{story.name}</b>
                    <span>{story.role}</span>
                  </div>
                </footer>
              </article>
            ))}
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
              <p className="lede">
                Find answers, tutorials and support to get the most out of Clothsy AI.
              </p>
              <Link className="btn btn-ghost" href="#help" style={{ marginTop: "28px" }}>
                Visit Help Center <ArrowRight className="btn-arrow" />
              </Link>
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

      {/* ---------------- newsletter ---------------- */}
      <section className="section" id="newsletter" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div className="newsletter">
            <div>
              <h2 className="display">Stay updated with Clothsy AI</h2>
              <p>Get the latest product updates, research and fashion tech insights.</p>
            </div>
            <NewsletterForm />
          </div>
        </div>
      </section>
    </main>
  );
}
