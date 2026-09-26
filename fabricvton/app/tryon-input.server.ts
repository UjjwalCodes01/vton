// Input validation for the public try-on endpoint.
//
// Everything here runs before a single byte is decoded or forwarded upstream.
// Two things matter:
//
//   * The garment URL is handed to the engine as a reference URL, i.e. we ask a third
//     party to fetch a URL a storefront caller chose. Unconstrained, that is a
//     request-forgery primitive pointed at someone else's egress, and it also
//     lets a caller use our paid provider quota to process arbitrary images. Only
//     Shopify-hosted product images are legitimate here.
//
//   * The person image arrives base64-encoded in a JSON body. Decoding first and
//     checking the size afterwards means a 200MB body is fully buffered and
//     inflated in memory before we reject it — a trivial way to push the instance
//     into GC pressure or OOM. So the byte budget is enforced on Content-Length,
//     then on the encoded string length, and only then on the decoded buffer.

/** Decoded person-image ceiling. Matches MAX_UPLOAD_BYTES in the widget. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Ceiling for the whole request body.
 *
 * Base64 inflates by 4/3, plus the data-URL prefix and the JSON envelope of
 * metadata fields, so the body is allowed to be meaningfully larger than the
 * decoded image but not unboundedly so.
 */
export const MAX_REQUEST_BYTES = Math.ceil(MAX_IMAGE_BYTES * 1.4);

/** Ceiling for the base64 payload of a data URL, before decoding. */
export const MAX_BASE64_CHARS = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 1024;

// The engine accepts jpg and png only. The widget canvas-encodes everything to JPEG
// before upload, so this only narrows the direct multipart path.
export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

/**
 * Hosts a garment image may be served from.
 *
 * Shopify serves product media from cdn.shopify.com and the shopifycdn.com /
 * shopifycdn.net families; the shop's own domain covers themes that rewrite asset
 * URLs. Extra hosts can be allowed with ALLOWED_GARMENT_IMAGE_HOSTS for merchants
 * on a custom image CDN, but the default is Shopify-only.
 */
const DEFAULT_ALLOWED_IMAGE_HOST_SUFFIXES = [
  "cdn.shopify.com",
  "cdn.shopifycdn.com",
  "shopifycdn.com",
  "shopifycdn.net",
  "myshopify.com",
];

function extraAllowedHostSuffixes(): string[] {
  return (process.env.ALLOWED_GARMENT_IMAGE_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean);
}

function hostMatches(hostname: string, suffix: string) {
  return hostname === suffix || hostname.endsWith(`.${suffix}`);
}

export type GarmentUrlResult =
  | { ok: true; url: string }
  | { ok: false; reason: string };

/**
 * Normalizes and authorizes the garment image URL.
 *
 * Protocol-relative URLs are what Shopify's Liquid `img_url` emits, so those are
 * upgraded to https rather than rejected. Anything that is not https after that
 * — http, data:, file:, a redirect-looking relative path — is refused, as is any
 * host outside the allow-list and any URL carrying credentials.
 */
export function validateGarmentImageUrl(
  raw: string | null,
  shop: string
): GarmentUrlResult {
  const candidate = (raw ?? "").trim();
  if (!candidate) return { ok: false, reason: "missing" };
  if (candidate.length > 2048) return { ok: false, reason: "too long" };

  const normalized = candidate.startsWith("//") ? `https:${candidate}` : candidate;

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return { ok: false, reason: "not a valid absolute URL" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, reason: `protocol ${url.protocol} is not allowed` };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "URL must not carry credentials" };
  }

  const hostname = url.hostname.toLowerCase();
  const allowed = [
    ...DEFAULT_ALLOWED_IMAGE_HOST_SUFFIXES,
    ...extraAllowedHostSuffixes(),
    shop.toLowerCase(),
  ];

  if (!allowed.some((suffix) => hostMatches(hostname, suffix))) {
    return { ok: false, reason: `host ${hostname} is not a Shopify image origin` };
  }

  return { ok: true, url: url.toString() };
}

/**
 * Rejects an oversized body from its declared length, before it is read.
 *
 * Content-Length is client-declared and can lie, which is why the encoded-length
 * and decoded-length checks still run — this only makes the common case cheap.
 */
export function declaredBodyTooLarge(request: Request): boolean {
  const declared = Number.parseInt(request.headers.get("Content-Length") ?? "", 10);
  return Number.isFinite(declared) && declared > MAX_REQUEST_BYTES;
}

/**
 * Decodes a base64 data URL into a Blob, refusing anything oversized before the
 * decode allocates.
 */
export function dataUrlToBlob(dataUrl: string, fallbackMimeType = "image/jpeg"): Blob {
  if (dataUrl.length > MAX_BASE64_CHARS) {
    throw new ImageTooLargeError();
  }

  const match = dataUrl.match(/^data:([^;,]+)?;base64,(.*)$/);
  if (!match) {
    throw new InvalidImageError("Invalid image data received from storefront");
  }

  const encoded = match[2];
  if (encoded.length > MAX_BASE64_CHARS) {
    throw new ImageTooLargeError();
  }

  const mimeType = (match[1] || fallbackMimeType).toLowerCase();
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new UnsupportedImageTypeError(mimeType);
  }

  const buffer = Buffer.from(encoded, "base64");
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new ImageTooLargeError();
  }

  // The declared type is the caller's word; the bytes are the evidence.
  const sniffed = sniffImageType(buffer);
  if (!sniffed) throw new InvalidImageError("That file is not a JPEG, PNG or WebP image");

  return new Blob([buffer], { type: sniffed });
}

/** The image type the leading bytes actually spell, or null. */
export function sniffImageType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export class InvalidImageError extends Error {}

export class ImageTooLargeError extends Error {
  constructor() {
    super(`Image exceeds the ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB limit`);
  }
}

export class UnsupportedImageTypeError extends Error {
  constructor(mimeType: string) {
    super(`Unsupported image type: ${mimeType}`);
  }
}

/**
 * Clamps a free-text field to a sane length.
 *
 * These values are stored, exported to CSV and used to build rate-limit scope
 * keys, so an unbounded string is a storage and index problem even when it is
 * otherwise harmless.
 */
export function clampText(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

/**
 * Anonymous session ids come from the widget (`Math.random().toString(36)`), so
 * they are untrusted input used as part of a rate-limit key. Restrict them to a
 * short token rather than storing whatever arrives.
 */
export function sanitizeSessionId(value: unknown): string | null {
  const text = clampText(value, 64);
  if (!text) return null;
  return /^[A-Za-z0-9_-]{4,64}$/.test(text) ? text : null;
}

/** Validates and normalizes a captured lead email. */
export function sanitizeEmail(value: unknown): string | null {
  const text = clampText(value, 254);
  if (!text) return null;
  const email = text.toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}
