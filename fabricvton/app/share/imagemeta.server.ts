// Removing embedded metadata from result images, without re-encoding them.
//
// A generated image can carry EXIF, XMP, IPTC, text chunks and C2PA "content
// credentials" written by whatever produced it. Those travel with the bytes to
// every shopper, merchant and person a look is shared with, and any metadata
// viewer reads them. So images are rewritten at the container level: the
// segments or chunks that hold pixels, colour and geometry are copied through
// byte for byte, and everything descriptive is dropped. The picture is
// unchanged; there is no quality loss and no native dependency.

export type ImageKind = "image/jpeg" | "image/png" | "image/webp";

export interface CleanImage {
  bytes: Uint8Array;
  type: ImageKind;
}

/** A copy with metadata removed, or null for a format this does not handle. */
export function stripImageMetadata(input: Uint8Array): CleanImage | null {
  try {
    if (input.length > 3 && input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff) {
      return { bytes: stripJpeg(input), type: "image/jpeg" };
    }
    if (input.length > 8 && input[0] === 0x89 && ascii(input, 1, 3) === "PNG") {
      return { bytes: stripPng(input), type: "image/png" };
    }
    if (input.length > 12 && ascii(input, 0, 4) === "RIFF" && ascii(input, 8, 4) === "WEBP") {
      return { bytes: stripWebp(input), type: "image/webp" };
    }
  } catch {
    // A malformed file is not ours to repair; the caller decides what to do.
  }
  return null;
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

// ─── JPEG ──────────────────────────────────────────────────────────────────
//
// Kept: JFIF (APP0), an ICC profile (APP2 "ICC_PROFILE"), Adobe's colour
// transform flag (APP14 "Adobe"), and every non-APP segment. Dropped: EXIF and
// XMP (APP1), C2PA/JUMBF (APP11), IPTC (APP13), all other APPn, and comments.

function stripJpeg(input: Uint8Array) {
  const parts: Uint8Array[] = [input.subarray(0, 2)];
  let i = 2;

  while (i < input.length) {
    if (input[i] !== 0xff) throw new Error("Bad JPEG segment");
    let marker = input[i + 1];
    // Fill bytes: any number of 0xFF may precede a marker.
    while (marker === 0xff) {
      i += 1;
      marker = input[i + 1];
    }

    // Start of scan: everything from here is entropy-coded image data.
    if (marker === 0xda) {
      parts.push(input.subarray(i));
      return concat(parts);
    }
    // Markers with no length field.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(input.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (marker === 0xd9) {
      parts.push(input.subarray(i, i + 2));
      return concat(parts);
    }

    const length = (input[i + 2] << 8) | input[i + 3];
    if (length < 2 || i + 2 + length > input.length) throw new Error("Bad JPEG length");
    const segment = input.subarray(i, i + 2 + length);
    const body = input.subarray(i + 4, i + 2 + length);

    const keep =
      !(marker >= 0xe0 && marker <= 0xef) && marker !== 0xfe
        ? true
        : marker === 0xe0
          ? ascii(body, 0, 4) === "JFIF"
          : marker === 0xe2
            ? ascii(body, 0, 11) === "ICC_PROFILE"
            : marker === 0xee
              ? ascii(body, 0, 5) === "Adobe"
              : false;

    if (keep) parts.push(segment);
    i += 2 + length;
  }

  return concat(parts);
}

// ─── PNG ───────────────────────────────────────────────────────────────────
//
// Critical chunks are always kept. Of the ancillary ones, only those that
// change how the pixels render survive; text, EXIF, timestamps and C2PA do not.

const PNG_KEEP = new Set(["tRNS", "gAMA", "cHRM", "sRGB", "iCCP", "sBIT", "pHYs", "bKGD", "acTL", "fcTL", "fdAT"]);

function stripPng(input: Uint8Array) {
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const parts: Uint8Array[] = [input.subarray(0, 8)];
  let i = 8;

  while (i + 12 <= input.length) {
    const length = view.getUint32(i);
    const type = ascii(input, i + 4, 4);
    const end = i + 12 + length;
    if (end > input.length) throw new Error("Bad PNG chunk");

    const critical = type.charCodeAt(0) >= 65 && type.charCodeAt(0) <= 90;
    if (critical || PNG_KEEP.has(type)) parts.push(input.subarray(i, end));
    i = end;
    if (type === "IEND") break;
  }

  return concat(parts);
}

// ─── WebP ──────────────────────────────────────────────────────────────────
//
// EXIF and XMP chunks are removed and their flags cleared in the VP8X header;
// the RIFF size is recomputed. Unknown chunks are dropped too.

const WEBP_KEEP = new Set(["VP8 ", "VP8L", "VP8X", "ALPH", "ANIM", "ANMF", "ICCP"]);

function stripWebp(input: Uint8Array) {
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const chunks: Uint8Array[] = [];
  let i = 12;

  while (i + 8 <= input.length) {
    const type = ascii(input, i, 4);
    const size = view.getUint32(i + 4, true);
    const end = i + 8 + size + (size % 2);
    if (i + 8 + size > input.length) throw new Error("Bad WebP chunk");

    if (WEBP_KEEP.has(type)) {
      const chunk = input.slice(i, Math.min(end, input.length));
      // VP8X flags byte: bit 3 is EXIF, bit 2 is XMP.
      if (type === "VP8X" && chunk.length > 8) chunk[8] &= ~(0x08 | 0x04);
      chunks.push(chunk);
    }
    i = end;
  }

  const body = concat(chunks);
  const header = new Uint8Array(12);
  header.set(input.subarray(0, 12));
  new DataView(header.buffer).setUint32(4, body.length + 4, true);
  return concat([header, body]);
}
