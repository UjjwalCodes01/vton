import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createTryOnRoute } from "../src/next.js";
import { JPEG_BYTES, KEY, apiError, json, mockFetch } from "./helpers.js";

const BASE = "https://api.test/api/v1";
const PRODUCTS: Record<string, { imageUrl: string; title?: string }> = {
  "shirt-1": { imageUrl: "https://shop.test/shirt.jpg", title: "Blue shirt" },
};

function setup(...responders: Parameters<typeof mockFetch>) {
  const fetch = mockFetch(...responders);
  const resolved: string[] = [];
  const route = createTryOnRoute({
    apiKey: KEY,
    baseUrl: BASE,
    fetch,
    resolveProduct: async (productId, request) => {
      assert.ok(request instanceof Request);
      resolved.push(productId);
      return PRODUCTS[productId] ?? null;
    },
  });
  return { fetch, route, resolved };
}

function postRequest(
  fields: Partial<Record<"productId" | "consent" | "requestId" | "garmentUrl", string>> & { photo?: Blob | null } = {},
  headers: Record<string, string> = { host: "shop.test", origin: "https://shop.test" },
) {
  const form = new FormData();
  const photo = fields.photo === undefined ? new Blob([JPEG_BYTES], { type: "image/jpeg" }) : fields.photo;
  if (photo) form.append("photo", photo, "photo.jpg");
  form.append("productId", fields.productId ?? "shirt-1");
  form.append("consent", fields.consent ?? "true");
  form.append("requestId", fields.requestId ?? "req_0123456789");
  if (fields.garmentUrl) form.append("garmentUrl", fields.garmentUrl);
  return new Request("https://shop.test/api/tryon", { method: "POST", body: form, headers });
}

describe("createTryOnRoute POST", () => {
  test("uploads the photo, resolves the product on the server and starts a try-on", async () => {
    const { fetch, route, resolved } = setup(
      json({ id: "img_abc", expiresAt: "2026-10-01T00:00:00.000Z" }, 201),
      json({ id: "tryon-1", status: "pending", pollUrl: "/api/v1/tryons/tryon-1" }, 202),
    );
    const res = await route.POST(postRequest({ garmentUrl: "https://evil.test/ignored.jpg" }));
    assert.equal(res.status, 202);
    assert.deepEqual(await res.json(), { id: "tryon-1" });
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.deepEqual(resolved, ["shirt-1"]);

    const [upload, create] = fetch.calls;
    assert.equal(upload!.url, `${BASE}/images`);
    assert.ok((upload!.body as FormData).get("file") instanceof Blob);
    assert.equal(upload!.headers.get("authorization"), `Bearer ${KEY}`);

    assert.equal(create!.url, `${BASE}/tryons`);
    assert.equal(create!.headers.get("idempotency-key"), "req_0123456789");
    assert.deepEqual(JSON.parse(create!.body as string), {
      personImageId: "img_abc",
      garmentImageUrl: "https://shop.test/shirt.jpg",
      consent: true,
      title: "Blue shirt",
    });
  });

  test("returns 404 for an unknown product without calling the API", async () => {
    const { fetch, route } = setup();
    const res = await route.POST(postRequest({ productId: "nope" }));
    assert.equal(res.status, 404);
    assert.match((await res.json()).message, /isn't available/);
    assert.equal(fetch.calls.length, 0);
  });

  test("rejects cross-origin requests with 403", async () => {
    const { fetch, route, resolved } = setup();
    const res = await route.POST(postRequest({}, { host: "shop.test", origin: "https://evil.test" }));
    assert.equal(res.status, 403);
    assert.ok(typeof (await res.json()).message === "string");
    assert.equal(fetch.calls.length, 0);
    assert.equal(resolved.length, 0);
  });

  test("validates consent, photo and requestId", async () => {
    const { fetch, route } = setup();
    assert.equal((await route.POST(postRequest({ consent: "false" }))).status, 400);
    assert.equal((await route.POST(postRequest({ photo: null }))).status, 400);
    assert.equal((await route.POST(postRequest({ requestId: "bad id!" }))).status, 400);
    assert.equal((await route.POST(postRequest({ photo: new Blob(["gif"], { type: "image/gif" }) }))).status, 415);
    assert.equal(fetch.calls.length, 0);
  });

  test("maps API errors to friendly messages", async () => {
    const { route } = setup(json({ id: "img_abc", expiresAt: "x" }, 201), apiError(422, "PERSON_PHOTO_REJECTED"));
    const res = await route.POST(postRequest());
    assert.equal(res.status, 422);
    assert.match((await res.json()).message, /photo of just you/);
  });
});

describe("createTryOnRoute GET", () => {
  test("returns the try-on status", async () => {
    const { fetch, route } = setup(json({ id: "tryon-1", status: "success", resultUrl: "https://cdn.test/r.jpg" }));
    const res = await route.GET(new Request("https://shop.test/api/tryon?id=tryon-1"));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: "success", resultUrl: "https://cdn.test/r.jpg" });
    assert.equal(fetch.calls[0]!.url, `${BASE}/tryons/tryon-1`);
  });

  test("400 without an id, 404 for an unknown id", async () => {
    const { route } = setup(apiError(404, "NOT_FOUND"));
    assert.equal((await route.GET(new Request("https://shop.test/api/tryon"))).status, 400);
    assert.equal((await route.GET(new Request("https://shop.test/api/tryon?id=missing"))).status, 404);
  });
});
