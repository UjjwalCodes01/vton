import Image from "next/image";
import Link from "next/link";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/", label: "Virtual try-on" },
      { href: "/pricing", label: "Pricing" },
      { href: "/#how", label: "How it works" },
      { href: "/#try", label: "Install on Shopify" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/resources", label: "Guides & blog" },
      { href: "/resources#stories", label: "Customer stories" },
      { href: "/resources#help", label: "Help centre" },
      { href: "/pricing#faq", label: "FAQ" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/#about", label: "About" },
      { href: "/#contact", label: "Contact" },
      { href: "/#privacy", label: "Privacy" },
      { href: "/#terms", label: "Terms" },
    ],
  },
];

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
            <p>
              A realistic virtual fitting room for fashion brands — so shoppers buy with confidence and
              send less back.
            </p>
          </div>

          {columns.map((column) => (
            <div className="footer-col" key={column.title}>
              <b>{column.title}</b>
              {column.links.map((link) => (
                <Link key={link.label} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Clothsy AI. All rights reserved.</span>
          <div>
            <Link href="/#privacy">Privacy</Link>
            <Link href="/#terms">Terms</Link>
            <Link href="/#cookies">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
