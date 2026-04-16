import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "react-router";
import { Form, redirect, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const meta: MetaFunction = () => [
  { title: "FabricVTON | AI virtual try-on for Shopify" },
  {
    name: "description",
    content:
      "FabricVTON turns Shopify product pages into premium virtual fitting rooms with AI try-on, lead capture, and merchant analytics.",
  },
  { property: "og:title", content: "FabricVTON | AI virtual try-on for Shopify" },
  {
    property: "og:description",
    content:
      "Launch a premium AI try-on experience for fashion stores on Shopify.",
  },
  { property: "og:url", content: "https://www.fabricvton.com" },
  { name: "twitter:card", content: "summary_large_image" },
];

export const links: LinksFunction = () => [
  { rel: "canonical", href: "https://www.fabricvton.com" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700;800&display=swap",
  },
];

const featureCards = [
  {
    eyebrow: "Storefront",
    title: "Add try-on directly to product pages",
    text:
      "Use a Theme App Extension and a polished widget so shoppers can try products without leaving the page.",
  },
  {
    eyebrow: "Growth",
    title: "Capture leads while shoppers are already engaged",
    text:
      "Collect email addresses before generation, then keep those shoppers inside Shopify-ready marketing flows.",
  },
  {
    eyebrow: "Ops",
    title: "Track usage, credits, and conversion signals",
    text:
      "Give merchants a dashboard for activity, billing, lead exports, and operational control.",
  },
  {
    eyebrow: "Trust",
    title: "Built for Shopify standards",
    text:
      "App Bridge, GDPR webhooks, and a privacy-first image flow keep the experience aligned with Shopify expectations.",
  },
];

const steps = [
  {
    label: "1",
    title: "Install the widget",
    text:
      "Merchants enable the theme app extension and place the try-on button on the products they want to showcase.",
  },
  {
    label: "2",
    title: "Shoppers upload a photo",
    text:
      "Customers submit a portrait photo or selfie on the product page, then the system prepares the request for generation.",
  },
  {
    label: "3",
    title: "Generate and measure",
    text:
      "The result lands back on the storefront and the merchant sees the event, lead, and billing impact in the admin.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "$14.99",
    note: "Per month",
    details: ["100 monthly try-ons", "Lead capture", "Standard support"],
    highlight: false,
  },
  {
    name: "Growth",
    price: "$29",
    note: "Per month",
    details: ["250 monthly try-ons", "Analytics dashboard", "Email collection"],
    highlight: true,
  },
  {
    name: "Pro",
    price: "$99",
    note: "Per month",
    details: ["1,000 monthly generations", "Branding controls", "Priority support"],
    highlight: false,
  },
];

const faqs = [
  {
    q: "What does FabricVTON replace?",
    a: "It replaces static product imagery with a virtual fitting room that feels more interactive and conversion-focused.",
  },
  {
    q: "Can merchants control the widget?",
    a: "Yes. The app includes settings for enablement, appearance, billing, and admin-level controls.",
  },
  {
    q: "Is the customer photo stored permanently?",
    a: "No. The flow is designed around in-memory processing and privacy-first handling of customer images.",
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.gridGlow} aria-hidden="true" />

      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="FabricVTON home">
          <span className={styles.brandMark}>FV</span>
          <span className={styles.brandText}>
            <strong>FabricVTON</strong>
            <small>AI virtual try-on for Shopify</small>
          </span>
        </a>

        <nav className={styles.nav} aria-label="Primary">
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>

        <a className={styles.headerCta} href="#launch">
          Launch dashboard
        </a>
      </header>

      <main id="top" className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.pill}>Hosted on www.fabricvton.com</span>
            <h1>
              A premium virtual fitting room for fashion brands on Shopify.
            </h1>
            <p className={styles.lead}>
              Turn product pages into high-conversion try-on experiences with a
              polished storefront widget, lead capture, analytics, and a
              merchant dashboard designed for real operations.
            </p>

            <div className={styles.actions}>
              <a className={styles.primaryButton} href="#launch">
                Start with your store
              </a>
              <a className={styles.secondaryButton} href="#features">
                See what ships
              </a>
            </div>

            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <strong>Theme App Extension</strong>
                <span>No injected Liquid, clean Shopify setup</span>
              </div>
              <div className={styles.statCard}>
                <strong>Lead Capture</strong>
                <span>Collect emails before generation</span>
              </div>
              <div className={styles.statCard}>
                <strong>Merchant Control</strong>
                <span>Settings, billing, analytics, and exports</span>
              </div>
            </div>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.deviceFrame}>
              <div className={styles.deviceTop}>
                <span />
                <span />
                <span />
              </div>

              <div className={styles.visualStack}>
                <div className={styles.visualCardLarge}>
                  <span className={styles.visualKicker}>Storefront preview</span>
                  <div className={styles.avatarBlock}>
                    <div className={styles.avatarPerson} />
                    <div className={styles.avatarGarment} />
                  </div>
                  <div className={styles.visualBars}>
                    <span />
                    <span />
                    <span />
                  </div>
                </div>

                <div className={styles.visualGrid}>
                  <div className={styles.visualCardSmall}>
                    <span className={styles.visualKicker}>AI generation</span>
                    <strong>Product + person matched in one flow</strong>
                  </div>
                  <div className={styles.visualCardSmallAlt}>
                    <span className={styles.visualKicker}>Merchant analytics</span>
                    <strong>Track opens, conversions, and leads</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.trustBar} aria-label="Platform highlights">
          <span>Shopify App Bridge</span>
          <span>GDPR webhooks</span>
          <span>Privacy-first image flow</span>
          <span>Usage-based billing</span>
        </section>

        <section id="features" className={styles.section}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionEyebrow}>Features</span>
            <h2>Everything a fashion merchant needs to sell with confidence.</h2>
            <p>
              FabricVTON combines storefront experience, operational controls,
              and merchant analytics into one focused Shopify app.
            </p>
          </div>

          <div className={styles.featureGrid}>
            {featureCards.map((item) => (
              <article key={item.title} className={styles.featureCard}>
                <span className={styles.cardEyebrow}>{item.eyebrow}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="workflow" className={styles.sectionSplit}>
          <div className={styles.sectionHeadingLeft}>
            <span className={styles.sectionEyebrow}>Workflow</span>
            <h2>From product page to try-on result in three steps.</h2>
            <p>
              A clean flow keeps the storefront fast while still giving shoppers
              the instant visual feedback they expect.
            </p>
          </div>

          <div className={styles.stepColumn}>
            {steps.map((step) => (
              <article key={step.label} className={styles.stepCard}>
                <span className={styles.stepNumber}>{step.label}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className={styles.section}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionEyebrow}>Pricing</span>
            <h2>Simple plans that scale with generation volume.</h2>
            <p>
              Start small, then expand once your try-on engagement proves the
              conversion lift.
            </p>
          </div>

          <div className={styles.pricingGrid}>
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`${styles.pricingCard} ${plan.highlight ? styles.pricingFeatured : ""}`}
              >
                <span className={styles.planName}>{plan.name}</span>
                <div className={styles.planPriceRow}>
                  <strong>{plan.price}</strong>
                  <span>{plan.note}</span>
                </div>
                <ul>
                  {plan.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionEyebrow}>Launch</span>
            <h2>Open the merchant dashboard and connect your store.</h2>
            <p>
              Sign in with your Shopify shop domain to manage the app, monitor
              performance, and configure the storefront widget.
            </p>
          </div>

          <div id="launch" className={styles.launchPanel}>
            {showForm ? (
              <Form className={styles.form} method="post" action="/auth/login">
                <label className={styles.label}>
                  <span>Shop domain</span>
                  <input
                    className={styles.input}
                    type="text"
                    name="shop"
                    placeholder="your-store.myshopify.com"
                    autoComplete="off"
                  />
                </label>
                <button className={styles.button} type="submit">
                  Continue with Shopify
                </button>
              </Form>
            ) : (
              <div className={styles.formFallback}>
                <p>
                  Merchant login is unavailable in this environment. Deploy the
                  app and open it through Shopify to continue.
                </p>
              </div>
            )}
            <p className={styles.panelNote}>
              The public website is meant to live at https://www.fabricvton.com.
            </p>
          </div>
        </section>

        <section id="faq" className={styles.section}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionEyebrow}>FAQ</span>
            <h2>Frequently asked questions.</h2>
          </div>

          <div className={styles.faqGrid}>
            {faqs.map((item) => (
              <article key={item.q} className={styles.faqCard}>
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
