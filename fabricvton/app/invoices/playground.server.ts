// The Playground: run a try-on from the platform, without a storefront.
//
// It reuses the same engine the widget uses, with two differences. Credits come
// off the account rather than a store's plan allowance, and the garment is a
// file the person uploaded rather than a product image on a shop's CDN — so it
// is parked in our own bucket and served from our own domain, which is also
// what keeps the generator from ever seeing a URL that is not ours.

import { randomBytes, timingSafeEqual } from "node:crypto";
import { macFor, signFor } from "../signing.server";
import db from "../db.server";
import { createTryOnWithImage, EngineError, getGenerationStatus, mapGarmentCategory } from "../engine.server";
import { putObject, shareStorageConfigured } from "../share/storage.server";
import { rememberResultUrl, signImageToken } from "../share/imageproxy.server";
import { checkGarmentTitle, SafetyBlockError, SafetyUnavailableError, screenGarmentImage, screenPersonImage, screenResultUrl } from "../safety.server";

export class PlaygroundError extends Error {
  constructor(
    public status: number,
    message: string,
    /** The safety rule that refused the run, when that is why it failed. */
    public safetyCode?: string,
  ) {
    super(message);
  }
}

/** Playground runs are recorded against this synthetic shop, never a real one. */
export const playgroundShop = (accountId: string) => `playground:${accountId}`;

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function decodeDataUrl(value: unknown, label: string) {
  const text = typeof value === "string" ? value : "";
  const match = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(text.trim());
  if (!match) throw new PlaygroundError(400, `Add a ${label}.`);

  const contentType = match[1].toLowerCase();
  if (!ALLOWED.has(contentType)) throw new PlaygroundError(400, "Use a JPEG, PNG or WebP image.");

  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0) throw new PlaygroundError(400, `That ${label} could not be read.`);
  if (bytes.length > MAX_BYTES) throw new PlaygroundError(413, "That image is larger than 8MB.");

  return { bytes, contentType };
}

// ─── Serving the uploaded garment back ─────────────────────────────────────

/**
 * A signed, expiring link to one uploaded garment.
 *
 * The generator fetches this, so it must be reachable without a session — the
 * signature and the two-hour window are what stand in for one.
 */
export function signGarmentToken(key: string) {
  const payload = Buffer.from(JSON.stringify({ k: key, x: Date.now() + 2 * 3600_000 })).toString("base64url");
  return `${payload}.${signFor("garment", payload)}`;
}

export function readGarmentToken(token: string): string | null {
  const dot = String(token || "").lastIndexOf(".");
  if (dot < 1) return null;

  const payload = token.slice(0, dot);
  const expected = macFor("garment", payload);
  if (!expected) return null;
  const a = Buffer.from(token.slice(dot + 1));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.k !== "string" || !data.x || data.x < Date.now()) return null;
    return data.k;
  } catch {
    return null;
  }
}

// ─── Running one ───────────────────────────────────────────────────────────

export async function startPlaygroundRun(params: {
  accountId: string;
  personImage: unknown;
  garmentImage: unknown;
  title: unknown;
  publicBase: string;
  consent: boolean;
  requestId?: string;
  /** An API key with its own allowance pays instead of the account. */
  chargeKeyId?: string | null;
}) {
  if (!shareStorageConfigured()) {
    throw new PlaygroundError(503, "The Playground is not available right now.");
  }

  const person = decodeDataUrl(params.personImage, "photo of a person");
  const garment = decodeDataUrl(params.garmentImage, "product image");
  const title = typeof params.title === "string" ? params.title.trim().slice(0, 120) : "";
  if (!params.consent) throw new PlaygroundError(403, "Confirm that you are an adult and have permission to use this photo.");
  try {
    checkGarmentTitle(title, null);
    await Promise.all([
      screenPersonImage(new Blob([person.bytes], { type: person.contentType })),
      screenGarmentImage(garment.bytes),
    ]);
  } catch (error) {
    if (error instanceof SafetyBlockError) throw new PlaygroundError(422, error.message, error.code);
    if (error instanceof SafetyUnavailableError) throw new PlaygroundError(503, error.message);
    throw error;
  }

  // Spend the credit first, conditionally, so two tabs cannot both spend the
  // last one. It goes back if the run never starts.
  const keyId = params.chargeKeyId ?? null;
  const spent = await spendCredit(params.accountId, keyId);
  if (!spent) {
    throw keyId
      ? new PlaygroundError(402, "This API key has no try-ons left. Ask Clothsy AI to add more.", "key_credits")
      : new PlaygroundError(402, "You have no Playground credits left. Talk to us about a top-up.");
  }

  const refund = () => refundCredit(db, params.accountId, keyId);

  try {
    const extension = garment.contentType.split("/")[1].replace("jpeg", "jpg");
    // Under looks/ so the bucket's own 35-day expiry rule sweeps these up too.
    const key = `looks/playground/${randomBytes(12).toString("base64url")}.${extension}`;
    await putObject(key, garment.bytes, garment.contentType);

    const garmentUrl = `${params.publicBase}/g/${signGarmentToken(key)}`;

    const task = await createTryOnWithImage({
      personImage: new Blob([new Uint8Array(person.bytes)], { type: person.contentType }),
      filename: "playground.jpg",
      garmentImageUrl: garmentUrl,
      garmentCategory: mapGarmentCategory(title || null),
    });

    const event = await db.tryOnEvent.create({
      data: {
        shop: playgroundShop(params.accountId),
        sessionId: params.requestId,
        creditKeyId: keyId,
        status: "pending",
        productTitle: title || "Playground",
        providerTaskId: task.id,
      },
    });

    // Our event id goes to the browser; the generator's task id stays here.
    return { taskId: event.id };
  } catch (error) {
    await refund().catch(() => {});
    if (error instanceof PlaygroundError) throw error;
    console.error("[Playground] start failed:", error);
    throw new PlaygroundError(502, "That try-on could not be started. Your credit was not used.");
  }
}

export async function playgroundRunStatus(accountId: string, runId: string) {
  const shop = playgroundShop(accountId);
  const event = await db.tryOnEvent.findFirst({ where: { shop, id: runId } });
  if (!event || !event.providerTaskId) throw new PlaygroundError(404, "Unknown run.");
  const taskId = event.providerTaskId;

  if (event.status === "success") {
    return { status: "success" as const, imageToken: signImageToken(event.id) };
  }
  if (event.status === "failed") {
    return { status: "failed" as const, message: "That try-on did not finish. Your credit has been returned." };
  }

  let generation;
  try {
    generation = await getGenerationStatus(taskId);
  } catch (error) {
    // A proxy gateway throttle or a temporary upstream outage does not mean the
    // provider task failed (same rule as the storefront poll). Before, it became
    // a 500, and the SDK re-POSTed the whole try-on.
    if (error instanceof EngineError && [429, 502, 503, 504].includes(error.httpStatus)) {
      return { status: "pending" as const };
    }
    throw error;
  }

  if (generation.status === "COMPLETED" && generation.resultImageUrl) {
    try {
      await screenResultUrl(generation.resultImageUrl);
    } catch (error) {
      if (error instanceof SafetyUnavailableError) return { status: "pending" as const };
      if (error instanceof SafetyBlockError) {
        await failAndRefund(event.id, accountId, error.code, event.creditKeyId);
        return { status: "failed" as const, message: "That try-on did not pass safety screening. Your credit has been returned." };
      }
      throw error;
    }
    // Cached so the image proxy can serve it without asking again.
    rememberResultUrl(taskId, generation.resultImageUrl);
    await db.tryOnEvent.updateMany({
      where: { id: event.id, status: "pending" },
      data: { status: "success" },
    });
    return { status: "success" as const, imageToken: signImageToken(event.id) };
  }

  if (generation.status === "FAILED") {
    await failAndRefund(event.id, accountId, generation.errorCode ?? null, event.creditKeyId);
    return { status: "failed" as const, message: "That try-on did not finish. Your credit has been returned." };
  }

  return { status: "pending" as const };
}

async function failAndRefund(eventId: string, accountId: string, errorCode: string | null, keyId: string | null) {
  // Settle the event and refund in one transaction. A process crash or DB error
  // cannot mark the event failed while silently losing the customer's credit.
  await db.$transaction(async (tx) => {
    const { count } = await tx.tryOnEvent.updateMany({
      where: { id: eventId, status: "pending" },
      data: { status: "failed", errorCode },
    });
    if (count) await refundCredit(tx, accountId, keyId);
  });
}

/**
 * Takes one credit, atomically, from the key's own allowance when the run is
 * charged to a key, otherwise from the account. False when there is none left.
 */
export async function spendCredit(accountId: string, keyId: string | null) {
  const changed = keyId
    ? await db.$executeRaw`
        UPDATE "AccountApiKey" SET "credits" = "credits" - 1
        WHERE "id" = ${keyId} AND "accountId" = ${accountId} AND "credits" > 0 AND "revokedAt" IS NULL`
    : await db.$executeRaw`
        UPDATE "Account" SET "credits" = "credits" - 1
        WHERE "id" = ${accountId} AND "credits" > 0`;
  return changed > 0;
}

/** Gives the credit back to wherever it came from. */
export function refundCredit(client: Pick<typeof db, "$executeRaw">, accountId: string, keyId: string | null) {
  return keyId
    ? client.$executeRaw`UPDATE "AccountApiKey" SET "credits" = "credits" + 1 WHERE "id" = ${keyId}`
    : client.$executeRaw`UPDATE "Account" SET "credits" = "credits" + 1 WHERE "id" = ${accountId}`;
}
