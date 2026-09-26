"use client";

import StickyHeader from "../components/StickyHeader";
import { FadeUp } from "../components/ui/Animations";

export default function TermsOfService() {
  return (
    <div className="landing-shell">
      <StickyHeader />
      <main className="container main-content">
        <section className="section legal-section">
          <FadeUp>
            <div className="legal-header">
              <h1>Terms of Service</h1>
              <p className="effective-date">Effective Date: April 17th, 2025</p>
              <p className="effective-date">Last Updated: 25th September, 2026</p>
            </div>
          </FadeUp>
          
          <FadeUp delay={0.1}>
            <div className="legal-content">
              <p>
                Welcome to Clothsy AI. By installing our Shopify app or WooCommerce plugin, or by using our website or billing portal, you agree to these Terms of Service. Please read them carefully.
              </p>

              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing or using the Clothsy AI application, plugin, website, billing portal, or services (collectively, the "Service"), provided by FabricVTON ("we," "us," or "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.
              </p>

              <h2>2. Description of Service</h2>
              <p>
                Clothsy AI provides AI-powered virtual try-on for online stores, available as a Shopify app and as a WooCommerce plugin. The Service lets merchants offer their shoppers the ability to see a product on themselves before buying. It includes a billing portal where merchants manage their plan, credits and invoices.
              </p>
              <p>
                Generating a try-on relies on third-party AI processing infrastructure. We select and manage those providers, and we may change them at any time without notice, provided the Service continues to function as described.
              </p>

              <h2>3. User Accounts</h2>
              <p>To use the Service you must operate a Shopify or WooCommerce store, or hold an account on our billing portal. By installing the app or plugin, or by signing in to the portal:</p>
              <ul>
                <li>You represent that you are at least 18 years of age.</li>
                <li>You agree to provide accurate and complete information about yourself and your business.</li>
                <li>You are responsible for maintaining the security of your store and of any account used to reach the Service, including the sign-in method you use for our billing portal.</li>
                <li>You are responsible for all activities that occur under your account.</li>
                <li>You are responsible for obtaining any consent your shoppers must give before their photograph is processed, and for complying with the privacy laws that apply to them.</li>
              </ul>

              <h2>4. Acceptable Use</h2>
              <p>You agree not to use the Service to:</p>
              <ul>
                <li>Violate any laws or regulations.</li>
                <li>Infringe upon the intellectual property rights of others.</li>
                <li>Upload or process images that contain illegal, offensive, or inappropriate content.</li>
                <li>Attempt to reverse engineer, decompile, or hack the Service.</li>
                <li>Overburden or disrupt the integrity or performance of the Service.</li>
              </ul>

              <h2>5. Billing and Payments</h2>
              <p>How you are charged depends on where your store runs:</p>
              <ul>
                <li><strong>Shopify stores</strong> are billed through Shopify&apos;s own billing system, and those charges appear on your Shopify invoice.</li>
                <li><strong>WooCommerce stores</strong> are billed through our payment processor. Subscriptions renew monthly until cancelled.</li>
                <li><strong>Credit top-ups</strong> may be agreed with us separately and are paid through our payment processor from the billing portal.</li>
              </ul>
              <ul>
                <li><strong>Subscription plans:</strong> fees are billed in advance on a recurring basis, monthly or annually, as specified in your plan.</li>
                <li><strong>Try-on allowance:</strong> each plan includes a number of try-ons per billing cycle. The allowance resets at the start of each cycle and unused try-ons do not carry over.</li>
                <li><strong>Purchased credits:</strong> credits bought through an invoice are added to your current billing cycle and are used after your plan&apos;s own allowance. Like the plan allowance, they expire when that cycle resets and are not refunded or carried forward. The invoice states this before you pay.</li>
                <li><strong>Usage beyond the allowance:</strong> some plans permit additional try-ons beyond the included allowance at the rate shown in your plan. These are only ever charged where the billing platform supports them and where you have approved the applicable spending cap.</li>
                <li><strong>Refunds:</strong> refunds on Shopify follow Shopify&apos;s refund policy. All other refunds are at our discretion. A refund does not reverse credits that have already been granted or used.</li>
                <li><strong>Changes to pricing:</strong> we may modify our pricing with notice to you. Changes do not affect a billing cycle you have already paid for.</li>
                <li><strong>Taxes:</strong> amounts are exclusive of taxes unless stated otherwise, and you are responsible for any taxes applicable to you.</li>
              </ul>

              <h2>6. Intellectual Property</h2>
              <ul>
                <li><strong>Our Rights:</strong> We retain all rights, title, and interest in and to the Service, including all software, code, designs, and intellectual property.</li>
                <li><strong>Your Rights:</strong> You retain ownership of your product images and store data. By using the Service, you grant us a limited licence to process your images, and photographs your shoppers choose to submit, solely for the purpose of providing the virtual try-on functionality.</li>
                <li><strong>Product images:</strong> You confirm you hold the rights necessary for us to process the product images you make available through the Service.</li>
                <li><strong>Shared looks:</strong> Where a shopper chooses to share a try-on, we host a copy of that image at a link on our own domain so the link keeps working. Shared looks are deleted automatically after 30 days, and sooner on request.</li>
              </ul>

              <h2>7. Data Privacy and Security</h2>
              <p>
                Your privacy is important to us. Please refer to our Privacy Policy for detailed information on how we collect, use, and protect your data. By using the Service, you consent to our data practices as described in the Privacy Policy.
              </p>

              <h2>8. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, FabricVTON shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising out of or in connection with your use of the Service. The Service is provided "as is" and "as available" without warranties of any kind.
              </p>

              <h2>9. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts located in New Delhi, India.
              </p>

              <h2>10. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify you of any significant changes by email or through the App. Your continued use of the Service after such changes constitutes your acceptance of the new Terms.
              </p>

              <h2>11. Contact Information</h2>
              <p>If you have any questions about these Terms, please contact us at:</p>
              <p>
                <strong>FabricVTON</strong><br />
                New Delhi, India<br />
                Email: contact@fabricvton.com
              </p>
            </div>
          </FadeUp>
        </section>
      </main>
    </div>
  );
}
