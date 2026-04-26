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
              <p className="effective-date">Effective Date: April 17th, 2026</p>
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
                <li><strong>Customer Data (On your behalf):</strong> We collect and process your customers' photos and emails (if enabled) to provide the Virtual Try-On service. <em>Note: You do not have access to view customer uploaded photos or generated try-on results. Even when customers use the "Share" feature to send results to friends, this does not grant you access to view these images. See the Widget Privacy Policy for details.</em></li>
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
                <li><strong>Data Retention:</strong> Customer photos are automatically deleted after 7 days. Merchant account data is retained as long as the App is installed.</li>
                <li><strong>AI Training:</strong> We DO NOT use your or your customers' data to train our AI models.</li>
              </ul>

              <h2>5. Third-Party Subprocessors</h2>
              <p>We use the following trusted services to run our infrastructure:</p>
              <ul>
                <li><strong>Shopify:</strong> Platform and Billing.</li>
                <li><strong>Google Cloud (Vertex AI):</strong> Image generation (Enterprise-grade privacy).</li>
                <li><strong>Render:</strong> Server hosting.</li>
                <li><strong>PostHog:</strong> Product analytics.</li>
                <li><strong>Sentry:</strong> Error monitoring.</li>
                <li><strong>Crisp:</strong> Customer support chat.</li>
              </ul>

              <h2>6. Your Privacy Policy (Template)</h2>
              <p>
                Since you are the Data Controller, you may need to update your store's privacy policy to inform your customers about the Virtual Try-On feature. You can copy/paste the section below:
              </p>
              <div className="legal-quote">
                <strong>Suggested Text for Your Privacy Policy:</strong><br /><br />
                <em>Virtual Try-On Feature</em><br /><br />
                Our store uses FabricVTON, a virtual try-on application that allows you to see how products look on you before making a purchase.<br /><br />
                <strong>How it works:</strong> When you choose to use the virtual try-on feature, you will be asked to upload a photo of yourself. This photo is processed securely using artificial intelligence to generate a virtual try-on image.<br /><br />
                <strong>Data Privacy:</strong> Your uploaded photo and the generated result are processed solely for this purpose and are automatically deleted after 7 days. Your photos are NOT used to train AI models.<br /><br />
                For more details, please refer to the FabricVTON Widget Privacy Policy.
              </div>

              <h2>7. Contact Us</h2>
              <ul>
                <li><strong>General & Support:</strong> fabricvton@gmail.com</li>
              </ul>

              <h2>8. Legal</h2>
              <p>
                <strong>Publisher:</strong> FabricVTON<br />
                <strong>Address:</strong> KIET Group of Institutions, Muradnagar, Ghaziabad, Uttar Pradesh 201206, India.<br />
                <strong>Hosting:</strong> Vercel Inc., Covina, CA, USA.
              </p>
            </div>
          </FadeUp>
        </section>
      </main>
    </div>
  );
}
