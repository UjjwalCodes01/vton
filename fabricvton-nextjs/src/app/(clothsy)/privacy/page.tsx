"use client";

import StickyHeader from "../components/StickyHeader";
import Link from "next/link";
import { FadeUp } from "../components/ui/Animations";

export default function PrivacyPolicy() {
  return (
    <div className="landing-shell">
      <StickyHeader />
      <main className="container main-content">
        <section className="section legal-section">
          <FadeUp>
            <div className="legal-header">
              <h1>Privacy Policy (Merchants)</h1>
              <p className="effective-date">Effective Date: September 14th, 2026</p>
              <p className="effective-date">Last Updated: 25th September, 2026</p>
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="legal-content">
              <div className="legal-callout">
                <p>Looking for the privacy policy for the Virtual Try-On Widget?</p>
                <Link href="/widget-privacy" className="legal-link">
                  View Shopper/End-User Privacy Policy →
                </Link>
              </div>

              <p>
                This Privacy Policy describes how FabricVTON ("we", "us", or "our") collects, uses, and discloses information in connection with your installation and use of our Shopify application (the "App"). This policy is directed at Merchants (Store Owners).
              </p>

              <h2>1. Introduction</h2>
              <p>
                As a Shopify Merchant, you trust us with your store data and your customers' experience. We are committed to protecting this information. When you install the App, you act as the Data Controller for your customers' data, and we act as the Data Processor.
              </p>

              <h2>2. Information We Collect from Merchants</h2>
              <ul>
                <li><strong>Shopify Account Info:</strong> Name, email address, shop domain, and contact details (via Shopify API).</li>
                <li><strong>Billing Information:</strong> We do not store credit card details directly; billing is handled via Shopify's Billing API.</li>
                <li><strong>Studio Assets:</strong> If you use the FabricVTON Studio to generate marketing images, we process the model photos and product images you upload.</li>
                <li><strong>Customer Data (On your behalf):</strong> To provide the Virtual Try-On service we process your customers&apos; photos, and &mdash; where you have email capture enabled &mdash; we store their email address, the product they viewed, and their try-on history. <em>The email addresses and try-on history are available to you in the app (Leads and Analytics, including CSV export). Customer photos and generated try-on results are NOT: photos are never stored by FabricVTON, and results are only kept when a shopper taps Share Look (a copy of that one image, for 30 days, so their link works). See the Widget Privacy Policy for details.</em></li>
              </ul>

              <h2>3. How We Use Merchant Information</h2>
              <ul>
                <li>To provide and operate the Service (generating AI images).</li>
                <li>To process billing and subscription management.</li>
                <li>To communicate with you regarding updates, support, or billing issues.</li>
                <li>To provide you with analytics (e.g., "35% conversion uplift").</li>
              </ul>

              <h2>4. Data Processing & Security</h2>
              <p>We adhere to strict data security standards:</p>
              <ul>
                <li><strong>Encryption:</strong> All data is encrypted in transit (TLS) and at rest.</li>
                <li><strong>Data Retention:</strong> Customer photos are never stored by FabricVTON &mdash; they are forwarded to our AI provider for processing and the result is served from the provider. Generated images are not stored either, with one shopper-chosen exception: when a shopper taps Share Look, we keep a copy of that one image for 30 days so the shared link works, then delete it automatically. Shared looks are not linked to an email address and are deleted on that 30-day schedule even if you uninstall. Captured lead emails are retained until you delete them or the shop is redacted, because they are your marketing data. Try-on history has its email stripped after 90 days and the anonymous record deleted after 13 months; aggregate daily analytics are kept for about 25 months. Merchant account data is retained as long as the App is installed.</li>
                <li><strong>AI Training:</strong> We DO NOT use your or your customers' data to train our AI models.</li>
              </ul>

              <h2>5. Third-Party Subprocessors</h2>
              <p>We use the following categories of trusted service providers to run the Service. Each is bound by data-protection terms, and a current list of providers is available on request.</p>
              <ul>
                <li><strong>Shopify:</strong> platform and billing.</li>
                <li><strong>AI image-processing provider:</strong> generates the virtual try-on image. Receives the customer photo and the public product image URL, processes them transiently, and does not use them for model training.</li>
                <li><strong>Cloud hosting provider:</strong> runs our servers and database.</li>
                <li><strong>Cloud storage provider:</strong> holds the copy of a try-on image a shopper chose to share, for up to 30 days.</li>
                <li><strong>Website analytics:</strong> measures visits to our marketing website only. It is not used inside your store or the try-on widget.</li>
              </ul>

              <h2>6. Your Privacy Policy (Template)</h2>
              <p>
                Since you are the Data Controller, you may need to update your store's privacy policy to inform your customers about the Virtual Try-On feature. You can copy/paste the section below:
              </p>
              <div className="legal-quote">
                <strong>Suggested Text for Your Privacy Policy:</strong><br /><br />
                <em>Virtual Try-On Feature</em><br /><br />
                Our store uses FabricVTON, a virtual try-on application that allows you to see how products look on you before making a purchase.<br /><br />
                <strong>How it works:</strong> When you choose to use the virtual try-on feature, you will be asked to upload a photo of yourself. This photo is sent to an AI image-processing provider, which processes it to generate a virtual try-on image.<br /><br />
                <strong>Data Privacy:</strong> Your uploaded photo and the generated result are used solely for this purpose and are not stored by the try-on app. The only exception is a look you choose to share: if you tap Share Look, a copy of that one image is kept for 30 days so your link works, and anyone with the link can view it. Your photos are NOT used to train AI models.<br /><br />
                <strong>Email capture:</strong> If we ask for your email address before showing your try-on, that address is saved to our marketing list along with the product you viewed, and we may contact you about our products. You can ask us to delete it at any time.<br /><br />
                For more details, please refer to the FabricVTON Widget Privacy Policy.
              </div>

              <h2>7. Responding to Customer Data Requests</h2>
              <p>
                You are the Data Controller, so a customer&apos;s access or deletion request is your obligation to answer &mdash; but you do not have to compile it by hand:
              </p>
              <ul>
                <li><strong>Access requests:</strong> when a customer requests their data through Shopify, Shopify notifies FabricVTON and we immediately compile every record we hold for that email address. Open <strong>Privacy</strong> in the FabricVTON app to download it as JSON, send it to the customer, and record that you delivered it. Shopify expects a response within 30 days.</li>
                <li><strong>Deletion requests:</strong> Shopify&apos;s <code>customers/redact</code> webhook is handled automatically. We delete the customer&apos;s lead record, strip their email from their try-on history, and erase any stored export containing their data.</li>
                <li><strong>Uninstalling:</strong> Shopify&apos;s <code>shop/redact</code> webhook (sent 48 hours after uninstall) deletes all of your shop&apos;s data from FabricVTON. Looks shoppers chose to share are not tied to an email, so they are removed on their own 30-day schedule rather than immediately.</li>
              </ul>

              <h2>8. Contact Us</h2>
              <ul>
                <li><strong>General & Support:</strong> contact@fabricvton.com</li>
              </ul>

              <h2>9. Legal</h2>
              <p>
                <strong>Publisher:</strong> FabricVTON<br />
                <strong>Address:</strong> New Delhi, India.<br />
                <strong>Hosting:</strong> Vercel Inc., Covina, CA, USA.
              </p>
            </div>
          </FadeUp>
        </section>
      </main>
    </div>
  );
}
