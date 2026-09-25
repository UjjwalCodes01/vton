import Image from "next/image";
import Link from "next/link";
import { ADDRESS, CONTACT_HREF, LEGAL, PARENT_URL, SHOPIFY_URL, SOCIALS, WOO_URL } from "../lib/site";
import { Instagram, LinkedIn, XLogo } from "./icons";

type FooterLink = { href: string; label: string; external?: boolean };

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/", label: "Virtual try-on" },
      { href: "/pricing", label: "Pricing" },
      { href: "/#how", label: "How it works" },
      { href: SHOPIFY_URL, label: "Install on Shopify", external: true },
      { href: WOO_URL, label: "Install on WooCommerce", external: true },
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
      { href: LEGAL.privacy, label: "Privacy" },
      { href: LEGAL.terms, label: "Terms" },
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
            <address className="footer-address">
              {ADDRESS.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </address>
            <div className="footer-social">
              {SOCIALS.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name === "LinkedIn" ? "Clothsy AI on LinkedIn" : `Clothsy AI on ${social.name} (@${social.handle})`}
                >
                  {social.name === "Instagram" ? <Instagram /> : social.name === "LinkedIn" ? <LinkedIn /> : <XLogo />}
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
          <span>
            © {new Date().getFullYear()} Clothsy AI · Powered by{" "}
            <a className="footer-powered" href={PARENT_URL} target="_blank" rel="noopener noreferrer">
              FabricVTON
            </a>
          </span>
          <div>
            <Link href={LEGAL.privacy}>Privacy</Link>
            <Link href={LEGAL.shopperPrivacy}>Shopper privacy</Link>
            <Link href={LEGAL.terms}>Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
