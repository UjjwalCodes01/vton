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
            </div>
          </FadeUp>
          
          <FadeUp delay={0.1}>
            <div className="legal-content">
              <p>
                Welcome to FabricVTON! By installing our Shopify Application or using our website, you agree to these Terms of Service. Please read them carefully.
              </p>

              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing or using the FabricVTON application ("App"), website, or services (collectively, the "Service"), provided by FabricVTON ("we," "us," or "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.
              </p>

              <h2>2. Description of Service</h2>
              <p>
                FabricVTON is a Shopify application that provides AI-powered virtual try-on capabilities for e-commerce stores. The Service allows merchants to offer their customers the ability to visualize products on themselves or models using artificial intelligence.
              </p>

              <h2>3. User Accounts</h2>
              <p>To use the Service, you must be a registered Shopify merchant. By installing the App:</p>
              <ul>
                <li>You represent that you are at least 18 years of age.</li>
                <li>You agree to provide accurate and complete information about yourself and your business.</li>
                <li>You are responsible for maintaining the security of your Shopify account and store.</li>
                <li>You are responsible for all activities that occur under your account.</li>
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
              <p>The Service is billed through Shopify's billing system.</p>
              <ul>
                <li><strong>Subscription Plans:</strong> We offer various subscription plans. Fees are billed in advance on a recurring basis (monthly or annually) as specified in your plan.</li>
                <li><strong>Usage Charges:</strong> Some plans may include usage limits. Overage fees may apply if you exceed these limits, as described in the plan details.</li>
                <li><strong>Refunds:</strong> Refunds are handled in accordance with Shopify's refund policy and at our sole discretion.</li>
                <li><strong>Changes to Pricing:</strong> We reserve the right to modify our pricing plans with notice to you.</li>
              </ul>

              <h2>6. Intellectual Property</h2>
              <ul>
                <li><strong>Our Rights:</strong> We retain all rights, title, and interest in and to the Service, including all software, code, designs, and intellectual property.</li>
                <li><strong>Your Rights:</strong> You retain ownership of your product images and store data. By using the Service, you grant us a limited license to process your images solely for the purpose of providing the virtual try-on functionality.</li>
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
                These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts located in Uttar Pradesh, India.
              </p>

              <h2>10. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify you of any significant changes by email or through the App. Your continued use of the Service after such changes constitutes your acceptance of the new Terms.
              </p>

              <h2>11. Contact Information</h2>
              <p>If you have any questions about these Terms, please contact us at:</p>
              <p>
                <strong>FabricVTON</strong><br />
                KIET Group of Institutions<br />
                Muradnagar, Ghaziabad<br />
                Uttar Pradesh 201206, India<br />
                Email: fabricvton@gmail.com
              </p>
            </div>
          </FadeUp>
        </section>
      </main>
    </div>
  );
}
