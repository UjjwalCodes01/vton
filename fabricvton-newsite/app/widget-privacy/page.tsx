import type { Metadata } from "next";
import LegalTabs from "../components/LegalTabs";
import { CONTACT_EMAIL, LEGAL } from "../lib/site";

export const metadata: Metadata = {
  title: "Shopper Privacy Policy",
  description: "What happens to your photo and your data when you use the Clothsy AI virtual try-on on a store's product page.",
  alternates: { canonical: "/widget-privacy" },
};

export default function WidgetPrivacyPolicy() {
  return (
    <main id="main" tabIndex={-1}>
      <article className="guide">
        <div className="shell guide-shell">
          <LegalTabs current={LEGAL.shopperPrivacy} />
          <p className="eyebrow eyebrow-violet">Legal · For shoppers</p>
          <h1 className="display">Privacy Policy for Shoppers</h1>
          <p className="lede">
            You are reading this because you are visiting an online store that uses Clothsy AI to provide a virtual try-on experience. This policy explains exactly what
            happens to your data when you use it.
          </p>
          <p className="legal-meta">Applicable to users of the Clothsy AI virtual try-on widget · Last updated September 25, 2026</p>

          <div className="guide-body">
            <h2>1. What Information We Collect</h2>
            <p>
              Nothing is sent anywhere until you tick the consent box in the try-on window. Choosing a photo only shows it to you, inside your own browser. When you tick the
              box and press Generate, we collect and process the following:
            </p>
            <ul>
              <li>
                <strong>Your photo:</strong> the image you upload to see the clothes on yourself.
              </li>
              <li>
                <strong>Your consent:</strong> we record the date and time you ticked the box, and which wording you agreed to, so we can show your consent was asked for and
                given.
              </li>
              <li>
                <strong>Email address:</strong> most stores require your email before the try-on runs. Where the store has enabled this, your email is saved and{" "}
                <strong>shared with the store owner as a marketing lead</strong>, together with the product you were viewing. If you would rather not share it, please do not
                use the try-on feature.
              </li>
              <li>
                <strong>Try-on history:</strong> for each try-on we record the product, the time, whether it succeeded, and &mdash; for up to 90 days &mdash; the email you
                entered. The store owner can see this history.
              </li>
              <li>
                <strong>Usage data:</strong> anonymous counts of how the widget is used (how often it is opened, how often a try-on succeeds), so the store owner can measure
                the feature and we can fix bugs.
              </li>
              <li>
                <strong>A look you choose to share:</strong> only if you tap <strong>Share Look</strong>, a copy of that one try-on image, together with the product&apos;s
                name, link and picture, so the link you send keeps working. Your original photo is never part of it.
              </li>
            </ul>

            <h2>2. How We Use Your Photo</h2>
            <p>Your photo is used for one purpose only:</p>
            <ul>
              <li>To generate the virtual try-on image showing you wearing the product.</li>
            </ul>
            <p>
              <strong>Privacy guarantee:</strong> we do not use your photos to train AI models, and neither does our AI provider. Your face and body data remain yours.
            </p>

            <h2>3. Data Retention</h2>
            <p>We operate with a strict data minimization policy. Different data is kept for different lengths of time, so here is all of it:</p>
            <ul>
              <li>
                <strong>Your photo:</strong> never stored by Clothsy AI at all. It is passed straight to our AI provider for processing and is never written to a Clothsy AI
                database or disk.
              </li>
              <li>
                <strong>The generated image:</strong> not stored either, unless you tap <strong>Share Look</strong>. Otherwise it is delivered to your browser from our AI
                provider&apos;s servers and never written to a Clothsy AI database or disk.
              </li>
              <li>
                <strong>A look you shared:</strong> when you tap Share Look, we keep a copy of that one image in our cloud storage so the link works, because the provider&apos;s
                own link expires within hours. It is deleted automatically after 30 days, or sooner if you ask us. It is not linked to your email address and is never
                used to train AI.
              </li>
              <li>
                <strong>Your email address:</strong> held as a marketing lead for the store owner until they delete it, until the store uninstalls Clothsy AI, or until you ask
                for it to be removed. Because this is the store owner&apos;s own marketing data, we do not expire it on a timer &mdash; see &ldquo;Your rights&rdquo; below to
                have it erased.
              </li>
              <li>
                <strong>Try-on history:</strong> your email is stripped from these records after 90 days. The remaining anonymous record (product, time, outcome) is deleted
                after 13 months.
              </li>
              <li>
                <strong>Aggregate statistics:</strong> daily totals containing no personal data, kept for about 25 months.
              </li>
            </ul>

            <h2>4. Who Sees Your Data?</h2>
            <ul>
              <li>
                <strong>The merchant:</strong> the owner of the store you are visiting is the &ldquo;Data Controller&rdquo;. They receive your email address, the product you
                tried on, and your try-on history, and can export that to a spreadsheet or their email marketing tool. They cannot see your uploaded photo, and they cannot
                see your try-on result unless you share its link with them.
              </li>
              <li>
                <strong>Anyone you send a shared look to:</strong> a shared look is a page at clothsyai.fabricvton.com/look/&hellip; with a long, random address. Anyone who
                has the link can open it while it exists, so only send it to people you want to see it. The page is hidden from search engines.
              </li>
              <li>
                <strong>Clothsy AI (us):</strong> we act as the &ldquo;Data Processor&rdquo; on the store owner&apos;s behalf.
              </li>
              <li>
                <strong>Our AI image-processing provider:</strong> performs the image generation. Your photo and the public product image URL are sent to them for
                processing. They process the images transiently, are contractually bound to protect them, and do not use them for model training.
              </li>
              <li>
                <strong>Our cloud storage provider:</strong> holds the copy of a look you chose to share, for up to 30 days, so the link works. It does not use it for
                anything else.
              </li>
            </ul>
            <p>We do not sell your data, and we do not share it with advertisers.</p>

            <h2>5. Your Rights</h2>
            <p>Under laws like the GDPR, the CCPA and India&apos;s Digital Personal Data Protection Act, 2023, you have rights regarding your data:</p>
            <ul>
              <li>
                <strong>Right to access:</strong> you can ask the store you used for a copy of everything held about you. You can also email us directly at{" "}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
              </li>
              <li>
                <strong>Right to deletion:</strong> your photos are never stored, so there is nothing to delete there. A look you shared is deleted automatically after 30
                days; to have it deleted sooner, email us its link. To have your email address and try-on history erased, contact the store you used, or email us and we
                will erase them.
              </li>
              <li>
                <strong>Response time:</strong> requests are answered within 30 days.
              </li>
            </ul>

            <h2>6. If You Are in India</h2>
            <p>
              India&apos;s Digital Personal Data Protection Act, 2023 applies to your use of the try-on. Under that Act the store you are visiting is the{" "}
              <strong>Data Fiduciary</strong> and Clothsy AI is its <strong>Data Processor</strong>. We process your photo, your email address and your try-on history only on
              the consent you give in the try-on window, and only for the purposes described above.
            </p>
            <ul>
              <li>
                <strong>Withdrawing your consent:</strong> you can withdraw it at any time, as easily as you gave it, by emailing us from the address you entered, or by
                telling the store you used. We stop processing your data and erase what we hold for you. Your photo was never stored, so there is nothing left of it to
                withdraw.
              </li>
              <li>
                <strong>What withdrawal means:</strong> past try-ons you already received are not undone, and you will need to give consent again the next time you want to
                use the try-on.
              </li>
              <li>
                <strong>Grievances:</strong> if something about your data has gone wrong, write to us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We acknowledge
                every grievance within 7 days and resolve it within 30 days.
              </li>
              <li>
                <strong>The Data Protection Board:</strong> if you raised a grievance with us and are not satisfied with how it was handled, you may complain to the Data
                Protection Board of India.
              </li>
              <li>
                <strong>Language:</strong> you can ask us for this notice in English or in any language listed in the Eighth Schedule to the Constitution of India.
              </li>
              <li>
                <strong>Children:</strong> the try-on is not for anyone under 18. Before any photo is sent you confirm that you are 18 or older, or that your parent or
                guardian has agreed on your behalf. If you believe a child&apos;s photo has been used, tell us and we will erase every record of it.
              </li>
            </ul>

            <h2>7. Contact</h2>
            <p>
              If you have concerns about your privacy, or want to exercise any of the rights above, please reach out to us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. This is also the address for data protection questions and grievances.
            </p>
          </div>
        </div>
      </article>
    </main>
  );
}
