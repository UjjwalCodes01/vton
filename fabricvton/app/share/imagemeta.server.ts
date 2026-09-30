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

// ─── AI provenance ─────────────────────────────────────────────────────────
//
// Every result is an AI-modified photo, and transparency rules (Article 50 of
// the EU AI Act among them) expect that to be machine-readable. Stripping the
// generator's metadata above removed any such mark, so our own goes back in: a
// minimal XMP packet carrying the IPTC digital-source type for "composite with
// trained algorithmic media" — the standard term for an AI-edited photograph.
// It names no tool, vendor or person.

const XMP = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/"
    Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia"/>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="r"?>`;

const encoder = new TextEncoder();

/** Marks an already-cleaned image as AI-generated. Formats it can't mark pass through. */
export function labelAiGenerated(image: CleanImage): CleanImage {
  try {
    if (image.type === "image/jpeg") return { ...image, bytes: labelJpeg(image.bytes) };
    if (image.type === "image/png") return { ...image, bytes: labelPng(image.bytes) };
  } catch {
    // An unlabelled image is better than no image; the caller still has the clean one.
  }
  return image;
}

function labelJpeg(input: Uint8Array) {
  const header = encoder.encode("http://ns.adobe.com/xap/1.0/\0");
  const packet = encoder.encode(XMP);
  const length = 2 + header.length + packet.length;
  if (length > 0xffff) throw new Error("XMP too large for one segment");

  const segment = new Uint8Array(2 + length);
  segment[0] = 0xff;
  segment[1] = 0xe1;
  segment[2] = length >> 8;
  segment[3] = length & 0xff;
  segment.set(header, 4);
  segment.set(packet, 4 + header.length);

  // After SOI, and after a JFIF APP0 when there is one: JFIF must come first.
  let at = 2;
  if (input[2] === 0xff && input[3] === 0xe0) at = 4 + ((input[4] << 8) | input[5]);
  return concat([input.subarray(0, at), segment, input.subarray(at)]);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function labelPng(input: Uint8Array) {
  // iTXt: keyword \0, compression flag 0, method 0, language "" \0, translated "" \0, text.
  const data = concat([encoder.encode("XML:com.adobe.xmp"), new Uint8Array([0, 0, 0, 0, 0]), encoder.encode(XMP)]);
  const typeAndData = concat([encoder.encode("iTXt"), data]);
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(typeAndData, 4);
  view.setUint32(8 + data.length, crc32(typeAndData));

  // Before the first IDAT, where readers expect ancillary text chunks.
  const source = new DataView(input.buffer, input.byteOffset, input.byteLength);
  let i = 8;
  while (i + 12 <= input.length) {
    const length = source.getUint32(i);
    if (ascii(input, i + 4, 4) === "IDAT") return concat([input.subarray(0, i), chunk, input.subarray(i)]);
    i += 12 + length;
  }
  throw new Error("PNG has no IDAT");
}
