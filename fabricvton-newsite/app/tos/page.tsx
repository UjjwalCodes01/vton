import type { Metadata } from "next";
import LegalTabs from "../components/LegalTabs";
import { CONTACT_EMAIL, LEGAL } from "../lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply when you install Clothsy AI on your store or use its website.",
  alternates: { canonical: "/tos" },
};

export default function TermsOfService() {
  return (
    <main id="main" tabIndex={-1}>
      <article className="guide">
        <div className="shell guide-shell">
          <LegalTabs current={LEGAL.terms} />
          <p className="eyebrow eyebrow-violet">Legal</p>
          <h1 className="display">Terms of Service</h1>
          <p className="lede">
            Welcome to Clothsy AI! By installing our Shopify or WooCommerce app or using our website, you agree to these Terms of Service. Please read them carefully.
          </p>
          <p className="legal-meta">Effective April 17, 2025</p>

          <div className="guide-body">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Clothsy AI application (&ldquo;App&rdquo;), website, or services (collectively, the &ldquo;Service&rdquo;), provided by FabricVTON
              (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these
              Terms, you may not use the Service.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              Clothsy AI is a Shopify and WooCommerce application that provides AI-powered virtual try-on capabilities for e-commerce stores. The Service allows merchants to
              offer their customers the ability to visualize products on themselves before buying. The Service includes a billing portal where you manage
              your plan, credits and invoices.
            </p>

            <h2>3. User Accounts</h2>
            <p>To use the Service, you must be a registered Shopify or WooCommerce store owner. By installing the App:</p>
            <ul>
              <li>You represent that you are at least 18 years of age.</li>
              <li>You agree to provide accurate and complete information about yourself and your business.</li>
              <li>You are responsible for maintaining the security of your store account, and of any account or sign-in method you use to reach our billing portal.</li>
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
            <p>Shopify plans are billed through Shopify&apos;s billing system; WooCommerce plans are billed directly.</p>
            <ul>
              <li>
                <strong>Subscription plans:</strong> we offer several plans, each with a monthly try-on allowance. Fees are billed in advance on a recurring basis (monthly, or
                yearly on Shopify) as specified in your plan.
              </li>
              <li>
                <strong>Usage limits:</strong> your allowance is your limit &mdash; there are no overage charges. Exceeding it pauses the try-on until the next billing
                period or an upgrade.
              </li>
              <li>
                <strong>Refunds:</strong> refunds are handled in accordance with Shopify&apos;s refund policy (Shopify plans) or at our sole discretion (WooCommerce plans).
              </li>
              <li>
                <strong>Credit top-ups:</strong> we may agree a one-off purchase of additional try-ons with you. These are invoiced through our billing portal and
                paid by card or UPI through our payment processor.
              </li>
              <li>
                <strong>Purchased credits expire:</strong> credits bought this way are added to your current billing cycle and are used after your plan&apos;s own
                allowance. Like the plan allowance, they expire when that cycle resets, and they are not refunded or carried forward. The invoice states this
                before you pay.
              </li>
              <li>
                <strong>Changes to pricing:</strong> we reserve the right to modify our pricing plans with notice to you.
              </li>
              <li>
                <strong>Taxes:</strong> amounts are exclusive of taxes unless stated otherwise, and you are responsible for any taxes applicable to you.
              </li>
            </ul>

            <h2>6. Intellectual Property</h2>
            <ul>
              <li>
                <strong>Our rights:</strong> we retain all rights, title, and interest in and to the Service, including all software, code, designs, and intellectual
                property.
              </li>
              <li>
                <strong>Your rights:</strong> you retain ownership of your product images and store data. By using the Service, you grant us a limited license to process
                your images, and photographs your shoppers choose to submit, solely for the purpose of providing the virtual try-on functionality.
              </li>
              <li>
                <strong>Product images:</strong> you confirm you hold the rights necessary for us to process the product images you make available through the
                Service.
              </li>
              <li>
                <strong>Shared looks:</strong> where a shopper chooses to share a try-on, we host a copy of that image at a link on our own domain so the link
                keeps working. Shared looks are deleted automatically after 30 days, and sooner on request.
              </li>
            </ul>

            <h2>7. Data Privacy and Security</h2>
            <p>
              Your privacy is important to us. Please refer to our Privacy Policy for detailed information on how we collect, use, and protect your data. By using the
              Service, you consent to our data practices as described in the Privacy Policy.
            </p>

            <h2>8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, FabricVTON shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but
              not limited to loss of profits, data, or goodwill, arising out of or in connection with your use of the Service. The Service is provided &ldquo;as is&rdquo; and
              &ldquo;as available&rdquo; without warranties of any kind.
            </p>

            <h2>9. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising from these Terms shall be subject to the exclusive
              jurisdiction of the courts located in Uttar Pradesh, India.
            </p>

            <h2>10. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify you of any significant changes by email or through the App. Your continued use of the
              Service after such changes constitutes your acceptance of the new Terms.
            </p>

            <h2>11. Contact Information</h2>
            <p>If you have any questions about these Terms, please contact us at:</p>
            <p>
              <strong>FabricVTON</strong>
              <br />
              Near Shiv Mandir, Kendua Bazar Hatia Patti
              <br />
              Kenduadih, Dhanbad
              <br />
              Jharkhand 828116, India
              <br />
              Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
          </div>
        </div>
      </article>
    </main>
  );
}
