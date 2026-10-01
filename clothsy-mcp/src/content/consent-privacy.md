# Consent and privacy

A try-on processes a photo of a real person, so the API requires explicit consent on every request.

## What the API requires

- `consent: true` in every `POST /tryons` / `POST /tryons/sync` body (`consent: true` in the SDK, `consent=true` form field for `createTryOnRoute`). Without it: `403 CONSENT_REQUIRED`.
- Send it only after the person in the photo actively agreed: an unticked checkbox they tick themselves, before the photo leaves the device. Never pre-tick it or hard-code consent for photos you didn't collect this way.
- Photos must show a single **adult**. Don't offer try-on to, or with photos of, children.

## Suggested consent wording

> I'm 18 or over, this is a photo of me, and I agree to it being processed to create a virtual try-on.

Link your privacy policy next to it. Clothsy AI's shopper privacy notice is at https://clothsyai.fabricvton.com/widget-privacy if you want to point to it.

## Your privacy policy

Say that shopper photos are sent to a virtual try-on service to generate a preview image, how long you keep results (if at all) and how to contact you.

## Data handling

- Resize photos in the browser to ~1600 px JPEG before upload; this removes EXIF metadata such as GPS location.
- Uploaded image ids stop working after 24 hours; uploaded files are deleted automatically within 35 days.
- `resultUrl` expires after 24 hours. Don't keep results longer than you need.
- Don't log photos, result URLs tied to customer identities, or the API key.

## Testing

When testing (including with the `clothsy_test_tryon` tool), use a photo of a consenting adult, such as yourself or a licensed stock model photo.
