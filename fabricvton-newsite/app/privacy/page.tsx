import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "../components/icons";
import LegalTabs from "../components/LegalTabs";
import { CONTACT_EMAIL, LEGAL } from "../lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Clothsy AI, a product by FabricVTON, collects, uses and discloses information when a store installs and runs the app.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicy() {
  return (
    <main id="main" tabIndex={-1}>
      <article className="guide">
        <div className="shell guide-shell">
          <LegalTabs current={LEGAL.privacy} />
          <p className="eyebrow eyebrow-violet">Legal · For merchants</p>
          <h1 className="display">Privacy Policy</h1>
          <p className="lede">
            This policy describes how FabricVTON (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects, uses, and discloses information in connection with your
            installation and use of Clothsy AI (the &ldquo;App&rdquo;) on your Shopify or WooCommerce store. It is directed at merchants (store owners).
          </p>
          <p className="legal-meta">Effective September 14, 2026 · Last updated September 25, 2026</p>

          <div className="legal-callout">
            <p>Looking for the privacy policy your shoppers see?</p>
            <Link href={LEGAL.shopperPrivacy}>
              Read the shopper privacy policy <ArrowUpRight className="btn-arrow" />
            </Link>
          </div>

          <div className="guide-body">
            <h2>1. Introduction</h2>
            <p>
              As a merchant, you trust us with your store data and your customers&apos; experience. We are committed to protecting this information. When you install the App,
              you act as the Data Controller for your customers&apos; data, and we act as the Data Processor.
            </p>

            <h2>2. Information We Collect from Merchants</h2>
            <ul>
              <li>
                <strong>Store account info:</strong> name, email address, shop domain, and contact details, provided via the Shopify or WooCommerce integration.
              </li>
              <li>
                <strong>Billing information:</strong> we do not store card details directly; billing runs through Shopify&apos;s Billing API or your WooCommerce payment
                processor.
              </li>
              <li>
                <strong>Studio assets:</strong> if you use FabricVTON Studio to generate marketing images, we process the model photos and product images you upload.
              </li>
              <li>
                <strong>Customer data (on your behalf):</strong> to run the try-on we process your customers&apos; photos, and &mdash; where you have email capture enabled
                &mdash; we store their email address, the product they viewed, and their try-on history. The email addresses and try-on history are available to you in the
                app under Leads and Analytics, including CSV export. Customer photos and generated try-on results are not: photos are never stored by Clothsy AI, and results are
                only kept when a shopper taps Share Look (a copy of that one image, for 30 days, so their link works). See the shopper privacy policy for details.
              </li>
            </ul>

            <h2>3. How We Use Merchant Information</h2>
            <ul>
              <li>To provide and operate the service (generating the try-on images).</li>
              <li>To process billing and manage your subscription.</li>
              <li>To communicate with you about updates, support, or billing issues.</li>
              <li>To provide you with analytics on your store&apos;s try-on usage.</li>
            </ul>

            <h2>4. Data Processing &amp; Security</h2>
            <p>We adhere to strict data security standards:</p>
            <ul>
              <li>
                <strong>Encryption:</strong> all data is encrypted in transit (TLS) and at rest.
              </li>
              <li>
                <strong>Data retention:</strong> customer photos are never stored by Clothsy AI &mdash; they are forwarded to our AI provider for processing and the
                result is served from the provider. Generated images are not stored either, with one shopper-chosen exception: when a shopper taps Share Look, we keep a
                copy of that one image for 30 days so the shared link works, then delete it automatically. Shared looks are not linked to an email address and are
                deleted on that 30-day schedule even if you uninstall. Captured lead emails are retained until you delete them or the shop is uninstalled, because they are
                your marketing data. Try-on history has its email stripped after 90 days and the anonymous record deleted after 13 months; aggregate daily analytics are kept
                for about 25 months. Merchant account data is retained as long as the App is installed.
              </li>
              <li>
                <strong>AI training:</strong> we do not use your or your customers&apos; data to train our AI models.
              </li>
            </ul>

            <h2>5. Third-Party Subprocessors</h2>
            <p>We use the following categories of trusted service providers to run the service. Each is bound by data-protection terms, and a current list is available on request.</p>
            <ul>
              <li>
                <strong>Shopify / WooCommerce:</strong> platform and, on Shopify, billing.
              </li>
              <li>
                <strong>AI image-processing provider:</strong> generates the virtual try-on image. Receives the customer photo and the public product image URL, processes
                them transiently, and does not use them for model training.
              </li>
              <li>
                <strong>Cloud hosting provider:</strong> runs our servers and database.
              </li>
              <li>
                <strong>Cloud storage provider:</strong> holds the copy of a try-on image a shopper chose to share, for up to 30 days.
              </li>
              <li>
                <strong>Website analytics:</strong> measures visits to our marketing website only. It is not used inside your store or the try-on widget.
              </li>
            </ul>

            <h2>6. Your Own Privacy Policy (Template)</h2>
            <p>
              Since you are the Data Controller, you may need to update your store&apos;s privacy policy to inform customers about the virtual try-on feature. Feel free to
              copy the text below into it:
            </p>
            <div className="legal-quote">
              <strong>Suggested text for your privacy policy:</strong>
              <br />
              <br />
              <em>Virtual try-on feature</em>
              <br />
              <br />
              Our store uses Clothsy AI, a virtual try-on application that lets you see how products look on you before buying.
              <br />
              <br />
              <strong>How it works:</strong> when you choose to use the virtual try-on feature, you will be asked to upload a photo of yourself. This photo is sent to an AI
              image-processing provider, which processes it to generate a virtual try-on image.
              <br />
              <br />
              <strong>Data privacy:</strong> your uploaded photo and the generated result are used solely for this purpose and are not stored by the try-on app. The only
              exception is a look you choose to share: if you tap Share Look, a copy of that one image is kept for 30 days so your link works, and anyone with the link can
              view it. Your photos are not used to train AI models.
              <br />
              <br />
              <strong>Email capture:</strong> if we ask for your email address before showing your try-on, that address is saved to our marketing list along with the product
              you viewed, and we may contact you about our products. You can ask us to delete it at any time.
              <br />
              <br />
              For more details, see the Clothsy AI shopper privacy policy.
            </div>

            <h2>7. Responding to Customer Data Requests</h2>
            <p>You are the Data Controller, so a customer&apos;s access or deletion request is your obligation to answer &mdash; but you do not have to compile it by hand:</p>
            <ul>
              <li>
                <strong>Access requests:</strong> compile every record we hold for a customer&apos;s email address from the app&apos;s Privacy screen, download it as JSON, and
                send it to them. We recommend responding within 30 days.
              </li>
              <li>
                <strong>Deletion requests:</strong> on Shopify, the <code>customers/redact</code> webhook is handled automatically &mdash; we delete the customer&apos;s lead
                record, strip their email from their try-on history, and erase any stored export containing their data. On WooCommerce, use the same Privacy screen to erase a
                record on request.
              </li>
              <li>
                <strong>Uninstalling:</strong> on Shopify, the <code>shop/redact</code> webhook (sent 48 hours after uninstall) deletes all of your shop&apos;s data from
                Clothsy AI. On WooCommerce, uninstalling the plugin does the same. Looks shoppers chose to share are not tied to an email, so they are removed on their own
                30-day schedule rather than immediately.
              </li>
            </ul>

            <h2>8. Contact Us</h2>
            <ul>
              <li>
                <strong>General &amp; support:</strong> <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </li>
            </ul>

            <h2>9. Legal</h2>
            <p>
              <strong>Publisher:</strong> FabricVTON
              <br />
              <strong>Address:</strong> Near Shiv Mandir, Kendua Bazar Hatia Patti, Kenduadih, Dhanbad, Jharkhand 828116, India.
              <br />
              <strong>Hosting:</strong> Vercel Inc., Covina, CA, USA.
            </p>
          </div>
        </div>
      </article>
    </main>
  );
}
