import type { Metadata } from "next";
import Link from "next/link";
import { API_BASE_URL } from "../../../../lib/site";
import { Code, CodeTabs } from "../../../components/Code";
import Pager from "../../../components/Pager";
import { EndpointLine, ErrorTable, FieldTable } from "../../../components/Reference";
import { RES_UPLOADED } from "../../../components/samples";

export const metadata: Metadata = {
  title: "Upload image — Try-on API",
  description: "POST /images: upload a JPEG or PNG to Clothsy AI and get an image id to use in try-ons for the next 24 hours.",
  alternates: { canonical: "/docs/api/endpoints/upload-image" },
};

const CURL = `curl -X POST ${API_BASE_URL}/images \\
  -H "Authorization: Bearer $CLOTHSY_API_KEY" \\
  -F "file=@shopper.jpg;type=image/jpeg"`;

const SDK = `import { readFile } from "node:fs/promises";
import { Clothsy } from "clothsy-ai";

const clothsy = new Clothsy(); // reads CLOTHSY_API_KEY

const photo = await clothsy.images.upload(await readFile("shopper.jpg"), {
  filename: "shopper.jpg",
  contentType: "image/jpeg",
});

console.log(photo.id);        // "img_..." — pass it as personImageId
console.log(photo.expiresAt); // usable until then`;

export default function UploadImage() {
  return (
    <>
      <p className="eyebrow eyebrow-violet">Endpoints</p>
      <h1 className="display">Upload image</h1>
      <p className="lede">
        Send an image file straight to Clothsy AI and get back an id. Use the id in place of an image URL when you create
        a try-on — no storage bucket or signed URLs needed on your side.
      </p>
      <EndpointLine method="POST" path="/images" />
      <p>
        Uploading is free: no credit is used. An uploaded image can be used by your account for 24 hours, in as many
        try-ons as you like. <Link href="/docs/api/images">Uploading images</Link> explains when and why to use it.
      </p>

      <h2 id="headers">Headers</h2>
      <FieldTable
        head="Header"
        rows={[
          [
            "Authorization",
            "required",
            <>
              <code>Bearer</code> followed by your API key.
            </>,
          ],
          [
            "Content-Type",
            "required",
            <>
              <code>multipart/form-data</code>. Your HTTP client sets this, including the boundary, when you send a form.
            </>,
          ],
        ]}
      />

      <h2 id="body">Body</h2>
      <p>A multipart form with a single field:</p>
      <FieldTable
        rows={[
          [
            "file",
            "file, required",
            <>
              The image. JPEG or PNG, up to 4 MB. For a shopper photo, one adult, ideally full-length and facing the
              camera.
            </>,
          ],
        ]}
      />

      <h2 id="example">Example</h2>
      <CodeTabs
        tabs={[
          { label: "curl", code: CURL },
          { label: "SDK (TypeScript)", code: SDK },
        ]}
      />

      <h2 id="response">Response</h2>
      <Code title="201 Created" code={RES_UPLOADED} />
      <FieldTable
        rows={[
          [
            "id",
            "string",
            <>
              Starts with <code>img_</code>. Send it as <code>personImageId</code> or <code>garmentImageId</code> when you{" "}
              <Link href="/docs/api/endpoints/create-try-on">create a try-on</Link>.
            </>,
          ],
          [
            "expiresAt",
            "string",
            <>
              ISO 8601 time, 24 hours after the upload. After this the id stops working for good; upload the image again
              if you still need it.
            </>,
          ],
        ]}
      />

      <h2 id="errors">Errors</h2>
      <ErrorTable
        rows={[
          [400, "UNSUPPORTED_IMAGE", "The file isn't a JPEG or PNG."],
          [401, "INVALID_API_KEY", "The key is missing, malformed or revoked."],
          [413, "IMAGE_TOO_LARGE", "The file is larger than 4 MB. Resize it to about 1600 px and try again."],
          [429, "RATE_LIMITED", "More than 30 uploads in a minute. Wait for the Retry-After header."],
          [500, "INTERNAL_ERROR", "Something went wrong on our side. Retry after a moment."],
          [503, "UNAVAILABLE", "The service is briefly unavailable. Retry after a short wait."],
        ]}
      />
      <p>
        Every code is described in <Link href="/docs/api/errors">Errors &amp; limits</Link>.
      </p>

      <Pager current="/docs/api/endpoints/upload-image" />
    </>
  );
}
