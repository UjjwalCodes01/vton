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
import { createTryOn, getGenerationStatus, mapGarmentCategory, uploadCustomerImage } from "../engine.server";
import { putObject, shareStorageConfigured } from "../share/storage.server";
import { rememberResultUrl, signImageToken } from "../share/imageproxy.server";

export class PlaygroundError extends Error {
  constructor(
    public status: number,
    message: string,
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
}) {
  if (!shareStorageConfigured()) {
    throw new PlaygroundError(503, "The Playground is not available right now.");
  }

  const person = decodeDataUrl(params.personImage, "photo of a person");
  const garment = decodeDataUrl(params.garmentImage, "product image");
  const title = typeof params.title === "string" ? params.title.trim().slice(0, 120) : "";

  // Spend the credit first, conditionally, so two tabs cannot both spend the
  // last one. It goes back if the run never starts.
  const spent = await db.$executeRaw`
    UPDATE "Account" SET "credits" = "credits" - 1
    WHERE "id" = ${params.accountId} AND "credits" > 0
  `;
  if (spent === 0) {
    throw new PlaygroundError(402, "You have no Playground credits left. Talk to us about a top-up.");
  }

  const refund = () =>
    db.$executeRaw`UPDATE "Account" SET "credits" = "credits" + 1 WHERE "id" = ${params.accountId}`;

  try {
    const extension = garment.contentType.split("/")[1].replace("jpeg", "jpg");
    // Under looks/ so the bucket's own 35-day expiry rule sweeps these up too.
    const key = `looks/playground/${randomBytes(12).toString("base64url")}.${extension}`;
    await putObject(key, garment.bytes, garment.contentType);

    const garmentUrl = `${params.publicBase}/g/${signGarmentToken(key)}`;

    const upload = await uploadCustomerImage(
      new Blob([new Uint8Array(person.bytes)], { type: person.contentType }),
      "playground.jpg",
    );

    const task = await createTryOn({
      customerFileId: upload.fileId,
      garmentImageUrl: garmentUrl,
      garmentCategory: mapGarmentCategory(title || null),
    });

    const event = await db.tryOnEvent.create({
      data: {
        shop: playgroundShop(params.accountId),
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

  const generation = await getGenerationStatus(taskId);

  if (generation.status === "COMPLETED" && generation.resultImageUrl) {
    // Cached so the image proxy can serve it without asking again.
    rememberResultUrl(taskId, generation.resultImageUrl);
    await db.tryOnEvent.updateMany({
      where: { id: event.id, status: "pending" },
      data: { status: "success" },
    });
    return { status: "success" as const, imageToken: signImageToken(event.id) };
  }

  if (generation.status === "FAILED") {
    const { count } = await db.tryOnEvent.updateMany({
      where: { id: event.id, status: "pending" },
      data: { status: "failed", errorCode: generation.errorCode ?? null },
    });
    // Only the first observer refunds, so a page left polling cannot mint credits.
    if (count > 0) {
      await db.$executeRaw`UPDATE "Account" SET "credits" = "credits" + 1 WHERE "id" = ${accountId}`;
    }
    return { status: "failed" as const, message: "That try-on did not finish. Your credit has been returned." };
  }

  return { status: "pending" as const };
}
