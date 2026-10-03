import type { Metadata } from "next";
import Link from "next/link";
import { API_BASE_URL } from "../../../lib/site";
import { CodeTabs } from "../../components/Code";
import Pager from "../../components/Pager";
import { IMAGE_ID } from "../../components/samples";

export const metadata: Metadata = {
  title: "Uploading images — Try-on API",
  description:
    "Upload shopper photos to Clothsy AI instead of hosting them yourself, reuse one photo across many garments, and understand limits, lifetime and privacy.",
  alternates: { canonical: "/docs/api/images" },
};

const REUSE_SDK = `import { Clothsy } from "clothsy-ai";

const clothsy = new Clothsy(); // reads CLOTHSY_API_KEY

// Upload the shopper's photo once…
const photo = await clothsy.images.upload(photoBytes, { contentType: "image/jpeg" });

// …then try on as many garments as you like in the next 24 hours.
for (const product of outfit) {
  const look = await clothsy.tryons.run({
    person: { imageId: photo.id },
    garment: { url: product.imageUrl },
    title: product.title,
    consent: true,
  });
  console.log(product.title, look.resultUrl);
}`;

const REUSE_CURL = `# 1. Upload once
curl -X POST ${API_BASE_URL}/images \\
  -H "Authorization: Bearer $CLOTHSY_API_KEY" \\
  -F "file=@shopper.jpg;type=image/jpeg"
# => { "id": "${IMAGE_ID}", "expiresAt": "..." }

# 2. Use the id for each garment (a new Idempotency-Key each time)
for garment in denim-jacket linen-shirt wool-coat; do
  curl -X POST ${API_BASE_URL}/tryons \\
    -H "Authorization: Bearer $CLOTHSY_API_KEY" \\
    -H "Idempotency-Key: $(uuidgen)" \\
    -H "Content-Type: application/json" \\
    -d '{
      "personImageId": "${IMAGE_ID}",
      "garmentImageUrl": "https://your-cdn.example.com/'"$garment"'.jpg",
      "consent": true
    }'
done`;

export default function UploadingImages() {
  return (
    <>
      <p className="eyebrow eyebrow-violet">Guide</p>
      <h1 className="display">Uploading images</h1>
      <p className="lede">
        The API can take images in two ways: as a public HTTPS URL, or as a file you upload first. For shopper photos,
        uploading is usually simpler and more private.
      </p>

      <h2 id="why">Why upload</h2>
      <p>
        A try-on needs a photo of the shopper, and that photo normally starts life as a file in your server&apos;s memory.
        To pass it by URL you would have to store it somewhere, sign a short-lived link, make sure the link doesn&apos;t
        redirect, and delete the file afterwards. Uploading skips all of that: send the bytes to{" "}
        <Link href="/docs/api/endpoints/upload-image">
          <code>POST /images</code>
        </Link>
        , get back an id, and use the id in the try-on.
      </p>
      <div className="doc-table">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Upload</th>
              <th>URL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Storage you need</td>
              <td>None</td>
              <td>A bucket or CDN that can serve the file</td>
            </tr>
            <tr>
              <td>Best for</td>
              <td>Shopper photos, files from a form or a phone</td>
              <td>Product images already on your CDN</td>
            </tr>
            <tr>
              <td>Reuse</td>
              <td>Any number of try-ons for 24 hours</td>
              <td>As long as your URL stays valid</td>
            </tr>
            <tr>
              <td>Fetch rules</td>
              <td>None — the file is already with us</td>
              <td>HTTPS, HTTP 200 with no redirects, within 12 seconds</td>
            </tr>
            <tr>
              <td>Cost</td>
              <td>Free</td>
              <td>Free</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        You can mix the two in one request. A typical storefront uploads the shopper&apos;s photo and passes the garment
        as the product image URL it already has.
      </p>

      <h2 id="reuse">One photo, many garments</h2>
      <p>
        An uploaded image id isn&apos;t used up by a try-on. Upload a shopper&apos;s photo once and reuse the id for every
        item they want to see — a whole outfit, or everything they browse in one visit. Each try-on still costs one credit;
        the upload itself costs nothing.
      </p>
      <CodeTabs
        tabs={[
          { label: "SDK (TypeScript)", code: REUSE_SDK },
          { label: "curl", code: REUSE_CURL },
        ]}
      />
      <p>
        Each account can start 12 try-ons a minute. Running them one after another, as above, stays well inside that;
        if you start several at once, queue anything beyond the limit rather than sending it all together.
      </p>

      <h2 id="limits">Limits</h2>
      <ul>
        <li>JPEG or PNG only, up to 4 MB per file. Resizing to about 1600 px on the long side keeps photos well under.</li>
        <li>30 uploads a minute per account.</li>
        <li>An id works only for the account that uploaded it.</li>
        <li>
          Ids are opaque and can be up to 600 characters long. Store them as text as received; don&apos;t parse them or
          put them in a short column.
        </li>
        <li>
          An id works for 24 hours, until the <code>expiresAt</code> time in the upload response. After that it&apos;s gone
          for good — using it returns <code>400 INVALID_IMAGE_ID</code>, and you need to upload the file again.
        </li>
      </ul>

      <h2 id="privacy">Privacy and deletion</h2>
      <p>
        Uploaded files are deleted automatically, at the latest 35 days after upload, and an id can never be revived once
        it has expired. There is nothing for you to clean up. Even so, only upload what a try-on needs:
      </p>
      <ul>
        <li>Ask for the shopper&apos;s consent before you upload their photo, not after.</li>
        <li>
          Re-encode photos to JPEG before sending them. That drops camera metadata such as GPS location — the browser code
          in the <Link href="/docs/api/custom-store#button">custom store guide</Link> does it for you.
        </li>
        <li>
          Say in your own privacy policy that shopper photos are sent to a virtual try-on service, and that photos
          uploaded through this endpoint are kept for up to 35 days and then deleted automatically. (Our shopper privacy
          notice covers the Shopify and WooCommerce widgets, which never store photos, so don&apos;t link to it for the
          API.)
        </li>
      </ul>

      <Pager current="/docs/api/images" />
    </>
  );
}
