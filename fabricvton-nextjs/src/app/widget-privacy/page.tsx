"use client";

import StickyHeader from "../components/StickyHeader";
import { FadeUp } from "../components/ui/Animations";

export default function WidgetPrivacyPolicy() {
  return (
    <div className="landing-shell">
      <StickyHeader />
      <main className="container main-content">
        <section className="section legal-section">
          <FadeUp>
            <div className="legal-header">
              <h1>Privacy Policy for Shoppers</h1>
              <p className="effective-date">Applicable to users of the FabricVTON Virtual Try-On Widget</p>
              <p className="effective-date">Last Updated: 17th April, 2026</p>
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="legal-content">
              <p>
                You are reading this because you are visiting an online store that uses FabricVTON to provide a virtual try-on experience. This policy explains how your data (specifically your photo) is handled when you use this feature.
              </p>

              <h2>1. What Information We Collect</h2>
              <p>When you use the Virtual Try-On Widget, we collect and process the following data only with your active action:</p>
              <ul>
                <li><strong>Your Photo:</strong> The image you upload or take to see the clothes on yourself.</li>
                <li><strong>Email Address (Optional):</strong> In some cases, the store may ask for your email address to unlock the try-on feature or send you results.</li>
                <li><strong>Usage Data:</strong> Anonymous data about how you interact with the widget (e.g., if the try-on was successful) to help us fix bugs.</li>
              </ul>

              <h2>2. How We Use Your Photo</h2>
              <p>Your photo is used for one purpose only:</p>
              <ul>
                <li>To generate the virtual try-on image showing you wearing the product.</li>
              </ul>
              <p><strong>Privacy Guarantee:</strong> We DO NOT use your photos to train AI models. Your face and body data remain yours.</p>

              <h2>3. Data Retention (The 7-Day Rule)</h2>
              <p>We operate with a strict data minimization policy:</p>
              <ul>
                <li><strong>Automatic Deletion:</strong> Your uploaded photos and the generated try-on images are automatically and permanently deleted from our servers after 7 days.</li>
                <li><em>Why 7 days?</em> This short window allows you to view your results and share them if you choose, while ensuring your data isn't kept longer than necessary.</li>
              </ul>

              <h2>4. Who Sees Your Data?</h2>
              <ul>
                <li><strong>The Merchant:</strong> The owner of the online store you are visiting acts as the "Data Controller". If you provide your email, they receive it. <em>Important: The merchant does NOT have access to view your uploaded photos or your generated try-on results. These are private to your session.</em></li>
                <li><strong>Sharing with Friends:</strong> The widget includes a "Share" feature that allows you to create a temporary public link to your try-on result. You can send this link to friends. Even if you generate this link, the merchant still does not have access to view the photo in their backend systems.</li>
                <li><strong>FabricVTON (Us):</strong> We act as the "Data Processor". We process the image to make the technology work.</li>
                <li><strong>Google Cloud AI:</strong> We use Google's secure enterprise AI services to perform the image generation. They process the data transiently and do not use it for model training.</li>
              </ul>

              <h2>5. Your Rights</h2>
              <p>Under laws like GDPR and CCPA, you have rights regarding your data:</p>
              <ul>
                <li><strong>Right to Deletion:</strong> Your data is deleted automatically after 7 days. If you want it deleted sooner, please contact us at fabricvton@gmail.com.</li>
                <li><strong>Right to Access:</strong> You can see your data (the images) directly in the widget during your session.</li>
              </ul>

              <h2>6. Contact</h2>
              <p>If you have concerns about your privacy, please reach out to us at fabricvton@gmail.com.</p>
            </div>
          </FadeUp>
        </section>
      </main>
    </div>
  );
}
