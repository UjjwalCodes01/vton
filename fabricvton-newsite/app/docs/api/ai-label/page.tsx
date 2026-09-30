import type { Metadata } from "next";
import Link from "next/link";
import { Code } from "../../components/Code";
import Pager from "../../components/Pager";

export const metadata: Metadata = {
  title: "AI content label — Try-on API",
  description:
    "Every Clothsy AI try-on image carries machine-readable metadata saying it was made with AI. What it is, why it's there, and what you should still show shoppers.",
  alternates: { canonical: "/docs/api/ai-label" },
};

const CHECK = `exiftool -XMP-iptcExt:DigitalSourceType result.jpg`;

const CAPTION_HTML = `<figure class="tryon-result">
  <img src="RESULT_URL" alt="AI-generated preview of you wearing the Cropped denim jacket" />
  <figcaption>AI-generated try-on — the real fit may differ.</figcaption>
</figure>`;

export default function AiLabel() {
  return (
    <>
      <p className="eyebrow eyebrow-violet">Guide</p>
      <h1 className="display">AI content label</h1>
      <p className="lede">
        Every try-on image the API returns is marked, inside the file, as made with AI. Here&apos;s what that label is, why
        it&apos;s there, and the one thing you still need to do yourself.
      </p>

      <h2 id="what">What&apos;s in the file</h2>
      <p>
        Each result image carries an XMP metadata block with the IPTC <b>Digital Source Type</b> property set to{" "}
        <code>compositeWithTrainedAlgorithmicMedia</code>. That&apos;s the standard IPTC term for an image that combines
        real photographs with content made by a trained AI model — which is exactly what a try-on is: a real photo of the
        shopper, with the garment rendered on by AI.
      </p>
      <p>
        Because it uses an open, widely supported vocabulary, software that looks for AI provenance — photo tools, social
        platforms, content checkers — can read it without knowing anything about Clothsy AI. You can inspect it yourself
        with a metadata tool such as ExifTool:
      </p>
      <Code title="Terminal" code={CHECK} />
      <p>
        The value it prints ends in <code>compositeWithTrainedAlgorithmicMedia</code>.
      </p>

      <h2 id="why">Why it&apos;s there</h2>
      <p>
        Laws are starting to require that AI-generated images can be recognised as such. Article 50 of the EU AI Act, for
        example, expects synthetic images to be marked in a machine-readable way. Labelling every result at the source
        helps you meet transparency duties like these without extra work on your side.
      </p>
      <p>
        The label is always added and can&apos;t be switched off. It lives in the file&apos;s metadata, so it doesn&apos;t
        change how the image looks.
      </p>
      <div className="doc-note">
        This page explains what the API does; it isn&apos;t legal advice. If you&apos;re unsure what applies to your store,
        check with your own adviser.
      </div>

      <h2 id="your-part">What you still need to do</h2>
      <p>
        The label is invisible, and there is no option for a visible watermark or badge on the image itself. Metadata is
        also fragile: re-encoding, resizing or compressing an image — which many CDNs, image optimisers and upload
        pipelines do automatically — can strip it. So don&apos;t rely on the file alone.
      </p>
      <ol className="doc-steps">
        <li>
          <b>Tell shoppers in your UI.</b> Put a short caption next to every try-on image, such as &ldquo;AI-generated
          try-on&rdquo;. It&apos;s honest, it sets expectations about fit, and it works however the image is served.
        </li>
        <li>
          <b>Say it in the alt text too,</b> so people using screen readers get the same information.
        </li>
        <li>
          <b>Keep the file intact when you copy it.</b> <code>resultUrl</code> lasts 24 hours. If you save results for
          longer, store the bytes exactly as downloaded rather than re-saving them through an image library, so the label
          survives.
        </li>
      </ol>
      <Code title="product-page.html" code={CAPTION_HTML} />
      <p>
        This applies whichever way you integrate — plain HTTP, the <Link href="/docs/api/sdk">TypeScript SDK</Link>, or
        your own UI built on the <Link href="/docs/api/nextjs#custom-ui">Next.js hook</Link>.
      </p>

      <Pager current="/docs/api/ai-label" />
    </>
  );
}
