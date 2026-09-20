import Image from "next/image";
import Link from "next/link";
import { CONTACT_HREF, LEGAL, SHOPIFY_URL, SOCIALS } from "../lib/site";
import { Instagram, XLogo } from "./icons";

type FooterLink = { href: string; label: string; external?: boolean };

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/", label: "Virtual try-on" },
      { href: "/pricing", label: "Pricing" },
      { href: "/#how", label: "How it works" },
      { href: SHOPIFY_URL, label: "Install on Shopify", external: true },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/resources", label: "Guides" },
      { href: "/resources#stories", label: "Customer stories" },
      { href: "/resources#help", label: "Help" },
      { href: "/pricing#faq", label: "FAQ" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/#about", label: "About" },
      { href: CONTACT_HREF, label: "Contact" },
      { href: LEGAL.privacy, label: "Privacy", external: true },
      { href: LEGAL.terms, label: "Terms", external: true },
    ],
  },
];

function FooterAnchor({ link }: { link: FooterLink }) {
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer">
        {link.label}
      </a>
    );
  }
  if (link.href.startsWith("mailto:")) return <a href={link.href}>{link.label}</a>;
  return <Link href={link.href}>{link.label}</Link>;
}

export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer-top">
          <div className="footer-intro">
            <Link className="brand" href="/" aria-label="Clothsy AI home">
              <Image className="brand-mark" src="/clothsy-mark.png" alt="" width={72} height={72} />
              <Image className="brand-word" src="/clothsy-wordmark.png" alt="" width={600} height={149} />
            </Link>
            <p>A fitting room for the internet, so shoppers can see the piece on them before they buy.</p>
            <div className="footer-social">
              {SOCIALS.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Clothsy AI on ${social.name} (@${social.handle})`}
                >
                  {social.name === "Instagram" ? <Instagram /> : <XLogo />}
                </a>
              ))}
            </div>
          </div>

          {columns.map((column) => (
            <div className="footer-col" key={column.title}>
              <b>{column.title}</b>
              {column.links.map((link) => (
                <FooterAnchor key={link.label} link={link} />
              ))}
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Clothsy AI · A product by FabricVTON</span>
          <div>
            <a href={LEGAL.privacy} target="_blank" rel="noopener noreferrer">
              Privacy
            </a>
            <a href={LEGAL.shopperPrivacy} target="_blank" rel="noopener noreferrer">
              Shopper privacy
            </a>
            <a href={LEGAL.terms} target="_blank" rel="noopener noreferrer">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
