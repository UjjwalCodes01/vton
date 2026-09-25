import Link from "next/link";
import type { Metadata } from "next";
import { CtaBand } from "../_components/Blocks";
import PageHero from "../_components/PageHero";
import Shell from "../_components/Shell";
import { Arrow } from "../_components/Arrow";
import { ResearchToProduct } from "../_figures/Figures";
import { CLOTHSY_URL, CONTACT_EMAIL, CONTACT_HREF, SOCIALS } from "../_lib/site";
import { delay } from "../_lib/style";

export const metadata: Metadata = {
  title: "Company and vision",
  description:
    "FabricVTON is an AI research and technology company building visual AI that is faithful to the real world: to people, to materials and to physical detail.",
  alternates: { canonical: "/company" },
};

const BELIEFS = [
  {
    title: "Faithful before impressive",
    text: "A beautiful image of the wrong shirt is a failure. The output has to be true to the product and to the person: the print, the colour, the face, the body.",
  },
  {
    title: "Measure what people see",
    text: "Scores that average over whole images miss the details people notice first. We pair them with checks on the regions that matter and with human judgement.",
  },
  {
    title: "Clean data, clear consent",
    text: "Models should be built on data with clear rights and clear consent. Photos people upload to try something on are never used to train our models.",
  },
  {
    title: "Efficient by default",
    text: "A model too slow or too expensive to run on a live storefront never reaches anyone. Speed and cost are part of the research, not an afterthought.",
  },
  {
    title: "Research that ships",
    text: "We study problems that show up in real use, and the work that holds up goes into production, where people rely on it.",
  },
];

export default function CompanyPage() {
  return (
    <Shell current="/company">
      <PageHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Company" }]}
        eyebrow="COMPANY"
        title="Visual AI that understands the physical world."
        lead="FabricVTON is an AI research and technology company. We study how people, materials and objects look and behave, and turn that understanding into products people use."
      />

      {/* vision */}
      <section className="fv-block" aria-labelledby="vision-title">
        <div className="fv-wrap fv-two">
          <div data-reveal>
            <p className="fv-eyebrow" id="vision-title">
              OUR VISION
            </p>
            <p className="fv-statement">
              A photo you can trust <em>as much as the real thing.</em>
            </p>
          </div>
          <div className="fv-stack">
            <p className="fv-lead" data-reveal style={delay(60)}>
              Most generative image systems are judged on whether a picture looks plausible. We hold ourselves to a
              harder standard: whether it is true to the thing. The exact print on a shirt. The weight of a fabric. The way
              a sleeve folds when an arm bends.
            </p>
            <p className="fv-body" data-reveal style={delay(120)}>
              When an image meets that standard, it can stand in for a fitting room, a sample or a photoshoot. People can
              decide with confidence, businesses can show every product on every body, and fewer things are made, shipped
              and returned for nothing.
            </p>
            <p className="fv-body" data-reveal style={delay(180)}>
              We start with clothing because it is one of the hardest cases: soft, patterned, layered and worn in endless
              ways. What we learn about faithful generation there carries to other visual problems.
            </p>
          </div>
        </div>
      </section>

      {/* mission */}
      <section className="fv-block fv-block--beige" aria-labelledby="mission-title">
        <div className="fv-wrap fv-two">
          <div data-reveal>
            <p className="fv-eyebrow">OUR MISSION</p>
            <h2 className="fv-h2" id="mission-title">
              Build visual AI that is faithful, efficient and responsible, and put it to work.
            </h2>
          </div>
          <ol className="fv-rules">
            {BELIEFS.map((b, i) => (
              <li key={b.title} data-reveal style={delay(i * 60)}>
                <div>
                  <h3>{b.title}</h3>
                  <p>{b.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* research to product */}
      <section className="fv-block" aria-labelledby="loop-title">
        <div className="fv-wrap">
          <div className="fv-block-head">
            <div data-reveal>
              <p className="fv-eyebrow">FROM RESEARCH TO PRODUCT</p>
              <h2 className="fv-h2" id="loop-title">
                The research is the product’s engine.
              </h2>
            </div>
            <div data-reveal style={delay(80)}>
              <p className="fv-lead">
                Clothsy AI, our first product, puts virtual try-on on fashion stores’ product pages. Every improvement in
                fidelity, drape, consistency or speed reaches shoppers through it, and what we see in real use sets the
                next research question.
              </p>
              <Link className="fv-textlink" href="/products" data-magnet>
                About our products <Arrow />
              </Link>
            </div>
          </div>
          <div data-reveal>
            <ResearchToProduct />
          </div>
        </div>
      </section>

      {/* facts */}
      <section className="fv-block fv-block--panel fv-block--line" aria-labelledby="facts-title">
        <div className="fv-wrap">
          <div className="fv-block-head">
            <div data-reveal>
              <p className="fv-eyebrow">AT A GLANCE</p>
              <h2 className="fv-h2" id="facts-title">
                FabricVTON.
              </h2>
            </div>
          </div>
          <dl className="fv-facts">
            <div data-reveal>
              <dt>What we are</dt>
              <dd>An AI research and technology company.</dd>
            </div>
            <div data-reveal style={delay(60)}>
              <dt>Where we are</dt>
              <dd>Based in India.</dd>
            </div>
            <div data-reveal style={delay(120)}>
              <dt>First product</dt>
              <dd>
                <a href={CLOTHSY_URL}>Clothsy AI</a>, virtual try-on for Shopify and WooCommerce stores.
              </dd>
            </div>
            <div data-reveal>
              <dt>Research focus</dt>
              <dd>
                <Link href="/research">Visual understanding, generative vision, material intelligence, human–object interaction.</Link>
              </dd>
            </div>
            <div data-reveal style={delay(60)}>
              <dt>Contact</dt>
              <dd>
                <a href={CONTACT_HREF}>{CONTACT_EMAIL}</a>
              </dd>
            </div>
            <div data-reveal style={delay(120)}>
              <dt>Follow</dt>
              <dd>
                {SOCIALS.map((s, i) => (
                  <span key={s.name}>
                    {i ? " · " : ""}
                    <a href={s.href} target="_blank" rel="noopener noreferrer">
                      {s.name}
                    </a>
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <CtaBand eyebrow="WORK WITH US" title="Join the research team." text="We are looking for students, researchers and engineers who want hard problems with real users on the other end." />
    </Shell>
  );
}
