import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";

// The backend calls a WooCommerce store back to prove it controls the URL it
// registered. That URL is supplied by whoever registers, so without these
// checks it would be a way to make this server request its own internal
// network (cloud metadata endpoints, the database host, localhost admin ports).

/** Local development only: allows http:// and private addresses (e.g. a wp-env site on localhost). */
export const ALLOW_INSECURE_URLS = process.env.WOO_ALLOW_INSECURE_URLS === "true";

export class UnsafeUrlError extends Error {}

function isPrivateAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||   // carrier-grade NAT
      (a === 169 && b === 254) ||             // link-local, incl. cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224                                // multicast and reserved
    );
  }
  const lower = address.toLowerCase();
  if (lower.startsWith("::ffff:")) return isPrivateAddress(lower.slice(7));
  return (
    lower === "::" || lower === "::1" ||
    lower.startsWith("fc") || lower.startsWith("fd") ||   // unique local
    lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb") // link-local
  );
}

/** A store URL as stored and compared: origin plus path, never a trailing slash. */
export function storeUrlString(url: URL): string {
  return url.origin + url.pathname.replace(/\/+$/, "");
}

/**
 * Normalises a store URL to its origin plus path (no query, no trailing slash)
 * and rejects anything that isn't a plain public https URL.
 */
export function normaliseStoreUrl(raw: unknown): URL {
  if (typeof raw !== "string" || raw.length > 2048) throw new UnsafeUrlError("Invalid URL");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("Invalid URL");
  }
  const allowedProtocols = ALLOW_INSECURE_URLS ? ["https:", "http:"] : ["https:"];
  if (!allowedProtocols.includes(url.protocol)) throw new UnsafeUrlError("Store URL must use https");
  if (url.username || url.password) throw new UnsafeUrlError("Credentials in URL are not allowed");
  if (!ALLOW_INSECURE_URLS && (net.isIP(url.hostname.replace(/^\[|\]$/g, "")) || url.hostname === "localhost")) {
    throw new UnsafeUrlError("Store URL must be a public domain name");
  }
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url;
}

// Resolves and checks the address at connection time, so a hostname that
// passes a check and is then re-pointed at an internal address (DNS
// rebinding) is still refused.
const guardedLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    const list = addresses as dns.LookupAddress[];
    if (!ALLOW_INSECURE_URLS && list.some((entry) => isPrivateAddress(entry.address))) {
      return callback(new UnsafeUrlError(`Refusing private address for ${hostname}`), "", 4);
    }
    if ((options as dns.LookupOptions).all) {
      return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    }
    callback(null, list[0].address, list[0].family);
  });
};

/**
 * GETs a JSON document from a store, with the protections above: no redirects
 * (a redirect could point anywhere), a short timeout, and a small size cap.
 */
export function fetchStoreJson(target: URL, timeoutMs = 10_000, maxBytes = 64 * 1024): Promise<unknown> {
  const client = target.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.get(
      target,
      { lookup: guardedLookup, timeout: timeoutMs, headers: { Accept: "application/json", "User-Agent": "ClothsyAI-Verifier/1.0" } },
      (res) => {
        if ((res.statusCode ?? 0) >= 300) {
          res.resume();
          return reject(new Error(`Store responded ${res.statusCode}`));
        }
        let size = 0;
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            req.destroy(new Error("Store response too large"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch {
            reject(new Error("Store response was not JSON"));
          }
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("Store did not respond in time")));
    req.on("error", reject);
  });
}
