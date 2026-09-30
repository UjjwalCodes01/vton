import Link from "next/link";
import { FieldTable, type ErrorRow } from "./Reference";

/** Headers shared by POST /tryons and POST /tryons/sync. */
export function TryOnHeaders() {
  return (
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
          "Idempotency-Key",
          "required",
          <>
            8–128 characters: letters, digits, <code>_</code> or <code>-</code>. Use a new one for each try-on (a UUID is
            ideal) and the same one when you retry. A key you&apos;ve already used gives you back that earlier try-on
            instead of starting — and charging for — another.
          </>,
        ],
        [
          "Content-Type",
          "required",
          <>
            <code>application/json</code>
          </>,
        ],
      ]}
    />
  );
}

/** JSON body shared by POST /tryons and POST /tryons/sync. */
export function TryOnBody() {
  return (
    <>
      <p>
        Give each image either as a URL or as the id of an image you{" "}
        <Link href="/docs/api/endpoints/upload-image">uploaded</Link> — exactly one of the two for the person, and exactly
        one for the garment. You can mix them: an uploaded shopper photo with a garment URL from your CDN is the most
        common pairing.
      </p>
      <FieldTable
        rows={[
          [
            "personImageUrl",
            "string",
            <>HTTPS URL of a photo of one adult, ideally full-length and facing the camera.</>,
          ],
          [
            "personImageId",
            "string",
            <>
              Instead of <code>personImageUrl</code>: an <code>img_…</code> id from <code>POST /images</code>, uploaded by
              this account in the last 24 hours.
            </>,
          ],
          [
            "garmentImageUrl",
            "string",
            <>HTTPS URL of the product photo. One garment per image works best.</>,
          ],
          [
            "garmentImageId",
            "string",
            <>
              Instead of <code>garmentImageUrl</code>: an uploaded image id.
            </>,
          ],
          [
            "title",
            "string, optional",
            <>
              The product&apos;s name, such as &ldquo;Linen summer dress&rdquo;, up to 120 characters. It tells the engine
              what kind of garment it is placing, which improves the fit and placement.
            </>,
          ],
          [
            "consent",
            "boolean, required",
            <>
              Must be <code>true</code>. By sending it you confirm the person in the photo is an adult who agreed to the
              photo being used for a try-on, and that you have the rights to use both images.
            </>,
          ],
        ]}
      />
      <h3 id="url-rules">Rules for image URLs</h3>
      <ul>
        <li>HTTPS on the default port.</li>
        <li>
          The URL returns the image itself with HTTP 200. <b>Redirects are not followed.</b>
        </li>
        <li>It responds within 12 seconds.</li>
        <li>The file is a JPEG or PNG, no larger than 4 MB.</li>
      </ul>
      <p>
        Signed URLs are fine as long as they&apos;re still valid when the request arrives. Uploaded images skip these rules
        entirely, which is one reason to prefer them for shopper photos.
      </p>
    </>
  );
}

/** Errors either way of creating a try-on can return. */
export const TRYON_ERRORS: ErrorRow[] = [
  [400, "MISSING_IDEMPOTENCY_KEY", "The Idempotency-Key header is missing or not 8–128 allowed characters."],
  [400, "INVALID_IMAGE_URL", "An image URL isn't HTTPS, uses a non-default port, or points at a private address."],
  [400, "IMAGE_DOWNLOAD_FAILED", "An image URL didn't return the image with HTTP 200 within 12 seconds (redirects count as failures)."],
  [400, "UNSUPPORTED_IMAGE", "An image isn't a JPEG or PNG."],
  [400, "INVALID_IMAGE_ID", "An image id is unknown, older than 24 hours, or was uploaded by another account."],
  [401, "INVALID_API_KEY", "The key is missing, malformed or revoked."],
  [402, "INSUFFICIENT_CREDITS", "The account has no credits left."],
  [403, "CONSENT_REQUIRED", "consent wasn't true."],
  [413, "IMAGE_TOO_LARGE", "An image is larger than 4 MB."],
  [422, "PERSON_PHOTO_REJECTED", "The person photo doesn't clearly show exactly one adult."],
  [422, "IMAGE_REJECTED", "An image can't be used for a try-on."],
  [422, "GARMENT_REJECTED", "This item isn't available for virtual try-on."],
  [429, "RATE_LIMITED", "More than 12 try-ons started in a minute. Wait for the Retry-After header."],
  [500, "INTERNAL_ERROR", "Something went wrong on our side. Retry with the same Idempotency-Key."],
  [502, "START_FAILED", "The try-on couldn't be started and no credit was used. Retry with the same Idempotency-Key."],
  [503, "UNAVAILABLE", "Try-on is briefly unavailable. Retry after a short wait."],
];
