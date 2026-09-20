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
              <p className="effective-date">Last Updated: 20th September, 2026</p>
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="legal-content">
              <p>
                You are reading this because you are visiting an online store that uses FabricVTON to provide a virtual try-on experience. This policy explains exactly what happens to your data when you use this feature.
              </p>

              <h2>1. What Information We Collect</h2>
              <p>
                Nothing is sent anywhere until you tick the consent box in the try-on window. Choosing a photo only shows it to you, inside your own browser. When you tick the box and press Generate, we collect and process the following:
              </p>
              <ul>
                <li><strong>Your Photo:</strong> The image you upload to see the clothes on yourself.</li>
                <li><strong>Your Consent:</strong> We record the date and time you ticked the box, and which wording you agreed to, so that we can show your consent was asked for and given.</li>
                <li><strong>Email Address:</strong> Most stores require your email before the try-on runs. Where the store has enabled this, your email is saved and <strong>shared with the store owner as a marketing lead</strong>, together with the product you were viewing. If you would rather not share it, please do not use the try-on feature.</li>
                <li><strong>Try-On History:</strong> For each try-on we record the product, the time, whether it succeeded, and &mdash; for up to 90 days &mdash; the email you entered. The store owner can see this history.</li>
                <li><strong>Usage Data:</strong> Anonymous counts of how the widget is used (how often it is opened, how often a try-on succeeds), so the store owner can measure the feature and we can fix bugs.</li>
              </ul>

              <h2>2. How We Use Your Photo</h2>
              <p>Your photo is used for one purpose only:</p>
              <ul>
                <li>To generate the virtual try-on image showing you wearing the product.</li>
              </ul>
              <p><strong>Privacy Guarantee:</strong> We DO NOT use your photos to train AI models, and neither does our AI provider. Your face and body data remain yours.</p>

              <h2>3. Data Retention</h2>
              <p>We operate with a strict data minimization policy. Different data is kept for different lengths of time, so here is all of it:</p>
              <ul>
                <li><strong>Your photo and the generated image:</strong> never stored by FabricVTON at all. Your photo is passed straight to our AI provider for processing, and the result is delivered to your browser from their servers. Neither image is written to a FabricVTON database or disk.</li>
                <li><strong>Your email address:</strong> held as a marketing lead for the store owner until they delete it, until the store uninstalls FabricVTON, or until you ask for it to be removed. Because this is the store owner&apos;s own marketing data, we do not expire it on a timer &mdash; see &quot;Your Rights&quot; below to have it erased.</li>
                <li><strong>Try-on history:</strong> your email is stripped from these records after 90 days. The remaining anonymous record (product, time, outcome) is deleted after 13 months.</li>
                <li><strong>Aggregate statistics:</strong> daily totals containing no personal data, kept for about 25 months.</li>
              </ul>

              <h2>4. Who Sees Your Data?</h2>
              <ul>
                <li><strong>The Merchant:</strong> the owner of the store you are visiting is the &quot;Data Controller&quot;. They receive your email address, the product you tried on, and your try-on history, and they can export that to a spreadsheet or to their email marketing tool. <em>They cannot see your uploaded photo or your generated try-on result &mdash; those are never stored anywhere the store owner could reach them.</em></li>
                <li><strong>FabricVTON (Us):</strong> we act as the &quot;Data Processor&quot; on the store owner&apos;s behalf.</li>
                <li><strong>Our AI image-processing provider:</strong> performs the image generation. Your photo and the public product image URL are sent to them for processing. They process the images transiently, are contractually bound to protect them, and do not use them for model training.</li>
              </ul>
              <p>We do not sell your data, and we do not share it with advertisers.</p>

              <h2>5. Your Rights</h2>
              <p>Under laws like the GDPR, the CCPA and India&apos;s Digital Personal Data Protection Act, 2023, you have rights regarding your data:</p>
              <ul>
                <li><strong>Right to Access:</strong> you can ask the store you used for a copy of everything held about you. When the store raises that request through Shopify, we compile every record we hold for your email address so the store can send it to you. You can also email us directly at fabricvton@gmail.com.</li>
                <li><strong>Right to Deletion:</strong> your photos are never stored, so there is nothing to delete there. To have your email address and try-on history erased, contact the store you used, or email us at fabricvton@gmail.com and we will erase them.</li>
                <li><strong>Response time:</strong> requests are answered within 30 days.</li>
              </ul>

              <h2>6. If You Are in India</h2>
              <p>
                India&apos;s Digital Personal Data Protection Act, 2023 applies to your use of the try-on. Under that Act the store you are visiting is the <strong>Data Fiduciary</strong> and FabricVTON is its <strong>Data Processor</strong>. We process your photo, your email address and your try-on history only on the consent you give in the try-on window, and only for the purposes described above.
              </p>
              <ul>
                <li><strong>Withdrawing your consent:</strong> you can withdraw it at any time, as easily as you gave it, by emailing fabricvton@gmail.com from the address you entered, or by telling the store you used. We stop processing your data and erase what we hold for you. Your photo was never stored, so there is nothing left of it to withdraw.</li>
                <li><strong>What withdrawal means:</strong> past try-ons you already received are not undone, and you will need to give consent again the next time you want to use the try-on.</li>
                <li><strong>Grievances:</strong> if something about your data has gone wrong, write to us at fabricvton@gmail.com. We acknowledge every grievance within 7 days and resolve it within 30 days.</li>
                <li><strong>The Data Protection Board:</strong> if you raised a grievance with us and are not satisfied with how it was handled, you may complain to the Data Protection Board of India.</li>
                <li><strong>Language:</strong> you can ask us for this notice in English or in any language listed in the Eighth Schedule to the Constitution of India.</li>
                <li><strong>Children:</strong> the try-on is not for anyone under 18. Before any photo is sent you confirm that you are 18 or older, or that your parent or guardian has agreed on your behalf. If you believe a child&apos;s photo has been used, tell us and we will erase every record of it.</li>
              </ul>

              <h2>7. Contact</h2>
              <p>If you have concerns about your privacy, or want to exercise any of the rights above, please reach out to us at fabricvton@gmail.com. This is also the address for data protection questions and grievances.</p>
            </div>
          </FadeUp>
        </section>
      </main>
    </div>
  );
}
