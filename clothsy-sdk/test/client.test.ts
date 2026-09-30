import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  Clothsy,
  ClothsyError,
  AuthenticationError,
  InsufficientCreditsError,
  ValidationError,
  RateLimitError,
  ServerError,
  ConnectionError,
  TryOnFailedError,
  TryOnTimeoutError,
  friendlyMessage,
  type TryOn,
} from "../src/index.js";
import { KEY, JPEG_BYTES, PNG_BYTES, apiError, hang, json, mockFetch, networkError } from "./helpers.js";

const BASE = "https://api.test/api/v1";
const client = (fetch: ReturnType<typeof mockFetch>, extra: Record<string, unknown> = {}) =>
  new Clothsy({ apiKey: KEY, baseUrl: BASE + "/", fetch, retryDelayMs: 1, ...extra });

const pending = (id = "t1") => json({ id, status: "pending", resultUrl: null });
const success = (id = "t1") => json({ id, status: "success", resultUrl: "https://cdn.test/r.jpg" });
const failed = (id = "t1") => json({ id, status: "failed", resultUrl: null, message: "Person photo rejected" });
const params = {
  person: { url: "https://shop.test/me.jpg" },
  garment: { imageId: "img_123" },
  consent: true as const,
};

describe("auth + basics", () => {
  test("sends the bearer token on every request", async () => {
    const fetch = mockFetch(json({ credits: 42 }));
    assert.equal(await client(fetch).account.credits(), 42);
    assert.equal(fetch.calls[0]!.url, `${BASE}/account`);
    assert.equal(fetch.calls[0]!.method, "GET");
    assert.equal(fetch.calls[0]!.headers.get("authorization"), `Bearer ${KEY}`);
  });

  test("throws a clear error without an API key", () => {
    const saved = process.env.CLOTHSY_API_KEY;
    delete process.env.CLOTHSY_API_KEY;
    try {
      assert.throws(() => new Clothsy({ fetch: mockFetch() }), (e: unknown) => {
        return e instanceof ClothsyError && e.code === "MISSING_API_KEY" && /CLOTHSY_API_KEY/.test(e.message);
      });
    } finally {
      if (saved !== undefined) process.env.CLOTHSY_API_KEY = saved;
    }
  });

  test("reads CLOTHSY_API_KEY from the environment", async () => {
    const saved = process.env.CLOTHSY_API_KEY;
    process.env.CLOTHSY_API_KEY = "clothsy_live_from_env";
    try {
      const fetch = mockFetch(json({ credits: 1 }));
      await new Clothsy({ fetch, baseUrl: BASE }).account.credits();
      assert.equal(fetch.calls[0]!.headers.get("authorization"), "Bearer clothsy_live_from_env");
    } finally {
      if (saved === undefined) delete process.env.CLOTHSY_API_KEY;
      else process.env.CLOTHSY_API_KEY = saved;
    }
  });

  test("refuses to run in a browser unless explicitly allowed", () => {
    const g = globalThis as any;
    g.window = {};
    g.document = {};
    try {
      assert.throws(
        () => new Clothsy({ apiKey: KEY, fetch: mockFetch() }),
        (e: unknown) => e instanceof ClothsyError && e.code === "BROWSER_NOT_ALLOWED" && /credits/.test(e.message),
      );
      assert.doesNotThrow(() => new Clothsy({ apiKey: KEY, fetch: mockFetch(), dangerouslyAllowBrowser: true }));
    } finally {
      delete g.window;
      delete g.document;
    }
  });
});

describe("retries", () => {
  test("reuses the same auto-generated idempotency key across retries", async () => {
    const fetch = mockFetch(
      apiError(503, "UNAVAILABLE"),
      networkError(),
      json({ id: "t1", status: "pending", pollUrl: "/api/v1/tryons/t1" }, 202),
    );
    const created = await client(fetch).tryons.create(params);
    assert.deepEqual(created, { id: "t1", status: "pending", pollUrl: "/api/v1/tryons/t1" });
    assert.equal(fetch.calls.length, 3);
    const keys = fetch.calls.map((c) => c.headers.get("idempotency-key"));
    assert.match(keys[0]!, /^[0-9a-f-]{36}$/);
    assert.ok(keys.every((k) => k === keys[0]));
    assert.equal(fetch.calls[0]!.headers.get("content-type"), "application/json");
    assert.deepEqual(JSON.parse(fetch.calls[0]!.body as string), {
      personImageUrl: "https://shop.test/me.jpg",
      garmentImageId: "img_123",
      consent: true,
    });
  });

  test("uses a caller-supplied idempotency key and a new one per call otherwise", async () => {
    const created = json({ id: "t1", status: "pending", pollUrl: "/x" }, 202);
    const fetch = mockFetch(created, created, created);
    const c = client(fetch);
    await c.tryons.create({ ...params, idempotencyKey: "order_42-abc" });
    await c.tryons.create(params);
    await c.tryons.create(params);
    assert.equal(fetch.calls[0]!.headers.get("idempotency-key"), "order_42-abc");
    assert.notEqual(fetch.calls[1]!.headers.get("idempotency-key"), fetch.calls[2]!.headers.get("idempotency-key"));
  });

  test("retries 503 then succeeds", async () => {
    const fetch = mockFetch(apiError(503, "UNAVAILABLE"), success());
    const t = await client(fetch).tryons.retrieve("t1");
    assert.equal(t.status, "success");
    assert.equal(fetch.calls.length, 2);
    assert.equal(fetch.calls[1]!.url, `${BASE}/tryons/t1`);
  });

  test("honours Retry-After on 429", async () => {
    const fetch = mockFetch(apiError(429, "RATE_LIMITED", { "Retry-After": "0" }), json({ credits: 3 }));
    assert.equal(await client(fetch, { retryDelayMs: 60_000 }).account.credits(), 3);
    assert.equal(fetch.calls.length, 2);
  });

  test("gives up after maxRetries", async () => {
    const fetch = mockFetch(apiError(500, "INTERNAL_ERROR"), apiError(502, "START_FAILED"), apiError(503, "UNAVAILABLE"));
    await assert.rejects(client(fetch).account.credits(), (e: unknown) => e instanceof ServerError && e.code === "UNAVAILABLE");
    assert.equal(fetch.calls.length, 3);
  });

  test("does not retry 422", async () => {
    const fetch = mockFetch(apiError(422, "PERSON_PHOTO_REJECTED"), success());
    await assert.rejects(client(fetch).tryons.create(params), (e: unknown) => {
      return e instanceof ValidationError && e.code === "PERSON_PHOTO_REJECTED" && e.status === 422;
    });
    assert.equal(fetch.calls.length, 1);
  });

  test("times out slow requests as ConnectionError and retries them", async () => {
    const fetch = mockFetch(hang(), hang(), hang());
    await assert.rejects(
      client(fetch, { timeoutMs: 20 }).account.credits(),
      (e: unknown) => e instanceof ConnectionError && e.code === "CONNECTION_ERROR" && /timed out/.test(e.message),
    );
    assert.equal(fetch.calls.length, 3);
  });
});

describe("errors", () => {
  const cases: Array<[number, string, new (...a: any[]) => ClothsyError]> = [
    [400, "MISSING_IDEMPOTENCY_KEY", ValidationError],
    [400, "INVALID_IMAGE_URL", ValidationError],
    [401, "INVALID_API_KEY", AuthenticationError],
    [402, "INSUFFICIENT_CREDITS", InsufficientCreditsError],
    [403, "CONSENT_REQUIRED", ValidationError],
    [404, "NOT_FOUND", ValidationError],
    [405, "METHOD_NOT_ALLOWED", ValidationError],
    [413, "IMAGE_TOO_LARGE", ValidationError],
    [422, "GARMENT_REJECTED", ValidationError],
    [429, "RATE_LIMITED", RateLimitError],
    [500, "INTERNAL_ERROR", ServerError],
    [502, "START_FAILED", ServerError],
    [503, "UNAVAILABLE", ServerError],
  ];
  for (const [status, code, Cls] of cases) {
    test(`${status} ${code} -> ${Cls.name}`, async () => {
      const fetch = mockFetch(apiError(status, code, status === 429 ? { "Retry-After": "12" } : {}));
      const err = await client(fetch, { maxRetries: 0 }).account.credits().catch((e: unknown) => e);
      assert.ok(err instanceof Cls, `expected ${Cls.name}, got ${(err as Error)?.constructor?.name}`);
      assert.ok(err instanceof ClothsyError);
      assert.equal(err.code, code);
      assert.equal(err.status, status);
      assert.equal(err.message, `error ${code}`);
      if (err instanceof RateLimitError) assert.equal(err.retryAfter, 12);
    });
  }

  test("network failure -> ConnectionError", async () => {
    const fetch = mockFetch(networkError());
    await assert.rejects(client(fetch, { maxRetries: 0 }).account.credits(), ConnectionError);
  });

  test("validates input before any request", async () => {
    const fetch = mockFetch();
    const c = client(fetch);
    const bad: any[] = [
      { ...params, person: { url: "https://a.test/a.jpg", imageId: "img_1" } },
      { ...params, person: {} },
      { ...params, garment: undefined },
      { ...params, person: { url: "http://insecure.test/a.jpg" } },
      { ...params, person: { url: "not a url" } },
      { ...params, consent: false },
      { ...params, consent: "true" },
      { ...params, title: "x".repeat(121) },
      { ...params, idempotencyKey: "short" },
      { ...params, idempotencyKey: "has spaces in it" },
    ];
    for (const p of bad) {
      await assert.rejects(c.tryons.create(p), (e: unknown) => e instanceof ValidationError && e.code === "INVALID_REQUEST");
      await assert.rejects(c.tryons.run(p), ValidationError);
    }
    await assert.rejects(c.tryons.retrieve(""), ValidationError);
    assert.equal(fetch.calls.length, 0);
  });

  test("friendlyMessage gives shopper-facing wording", () => {
    const e = (code: string) => new ClothsyError("x", { code });
    assert.match(friendlyMessage(e("PERSON_PHOTO_REJECTED")), /photo of just you/);
    assert.match(friendlyMessage(e("IMAGE_TOO_LARGE")), /JPEG or PNG .*under 4 MB/);
    assert.match(friendlyMessage(e("UNSUPPORTED_IMAGE")), /JPEG or PNG .*under 4 MB/);
    assert.match(friendlyMessage(e("RATE_LIMITED")), /busy.*try again in a minute/);
    const fallback = "Virtual try-on isn't available right now. Please try again later.";
    assert.equal(friendlyMessage(e("INVALID_API_KEY")), fallback);
    assert.equal(friendlyMessage(new Error("boom")), fallback);
    assert.equal(friendlyMessage("nope"), fallback);
  });
});

describe("waitFor", () => {
  test("polls until success and reports statuses", async () => {
    const fetch = mockFetch(pending(), pending(), success());
    const seen: TryOn["status"][] = [];
    const t = await client(fetch).tryons.waitFor("t1", { intervalMs: 1, onStatus: (s) => seen.push(s.status) });
    assert.equal(t.resultUrl, "https://cdn.test/r.jpg");
    assert.deepEqual(seen, ["pending", "pending", "success"]);
    assert.equal(fetch.calls.length, 3);
  });

  test("throws TryOnFailedError on failure", async () => {
    const fetch = mockFetch(pending(), failed());
    await assert.rejects(client(fetch).tryons.waitFor("t1", { intervalMs: 1 }), (e: unknown) => {
      return e instanceof TryOnFailedError && e.code === "TRYON_FAILED" && e.message === "Person photo rejected" && e.tryOnId === "t1";
    });
  });

  test("throws TryOnTimeoutError when it takes too long", async () => {
    const fetch = mockFetch(...Array.from({ length: 50 }, () => pending()));
    await assert.rejects(
      client(fetch).tryons.waitFor("t1", { intervalMs: 5, timeoutMs: 30 }),
      (e: unknown) => e instanceof TryOnTimeoutError && e.code === "TRYON_TIMEOUT" && e.tryOnId === "t1",
    );
  });

  test("waits out 429 using Retry-After", async () => {
    const limited = apiError(429, "RATE_LIMITED", { "Retry-After": "0" });
    const fetch = mockFetch(limited, success());
    const t = await client(fetch, { maxRetries: 0 }).tryons.waitFor("t1", { intervalMs: 1 });
    assert.equal(t.status, "success");
  });

  test("can be aborted", async () => {
    const fetch = mockFetch(...Array.from({ length: 50 }, () => pending()));
    const controller = new AbortController();
    setTimeout(() => controller.abort(new Error("stop")), 20);
    await assert.rejects(client(fetch).tryons.waitFor("t1", { intervalMs: 5, signal: controller.signal }), /stop/);
  });
});

describe("run", () => {
  test("returns the result when the sync call finishes (200)", async () => {
    const fetch = mockFetch(json({ id: "t1", status: "success", resultUrl: "https://cdn.test/r.jpg" }));
    const t = await client(fetch).tryons.run({ ...params, title: "Blue shirt" });
    assert.equal(t.resultUrl, "https://cdn.test/r.jpg");
    assert.equal(fetch.calls[0]!.url, `${BASE}/tryons/sync`);
    assert.equal(fetch.calls[0]!.method, "POST");
    assert.ok(fetch.calls[0]!.headers.get("idempotency-key"));
    assert.equal(JSON.parse(fetch.calls[0]!.body as string).title, "Blue shirt");
  });

  test("throws TryOnFailedError when the sync call reports failure", async () => {
    const fetch = mockFetch(json({ id: "t1", status: "failed", resultUrl: null, message: "Garment rejected" }));
    await assert.rejects(client(fetch).tryons.run(params), TryOnFailedError);
  });

  test("falls back to polling on 202", async () => {
    const fetch = mockFetch(
      json({ id: "t9", status: "pending", pollUrl: "/api/v1/tryons/t9" }, 202),
      pending("t9"),
      success("t9"),
    );
    const t = await client(fetch).tryons.run(params, { intervalMs: 1 });
    assert.equal(t.id, "t9");
    assert.equal(t.status, "success");
    assert.deepEqual(fetch.calls.map((c) => `${c.method} ${c.url}`), [
      `POST ${BASE}/tryons/sync`,
      `GET ${BASE}/tryons/t9`,
      `GET ${BASE}/tryons/t9`,
    ]);
  });
});

describe("images.upload", () => {
  test("sends multipart form data with a `file` field", async () => {
    const fetch = mockFetch(json({ id: "img_1", expiresAt: "2026-10-01T00:00:00.000Z" }, 201));
    const img = await client(fetch).images.upload(JPEG_BYTES);
    assert.deepEqual(img, { id: "img_1", expiresAt: "2026-10-01T00:00:00.000Z" });
    const call = fetch.calls[0]!;
    assert.equal(call.url, `${BASE}/images`);
    assert.equal(call.method, "POST");
    assert.ok(call.body instanceof FormData);
    assert.equal(call.headers.get("content-type"), null, "fetch must set the multipart boundary itself");
    const file = (call.body as FormData).get("file");
    assert.ok(file instanceof Blob);
    assert.equal(file.type, "image/jpeg");
    assert.equal(file.size, JPEG_BYTES.byteLength);
    assert.equal((file as File).name, "photo.jpg");
  });

  test("accepts Blobs and ArrayBuffers with explicit filename/content type", async () => {
    const ok = json({ id: "img_2", expiresAt: "x" }, 201);
    const fetch = mockFetch(ok, ok);
    const c = client(fetch);
    await c.images.upload(new Blob([PNG_BYTES], { type: "image/png" }), { filename: "me.png" });
    await c.images.upload(JPEG_BYTES.buffer.slice(0) as ArrayBuffer, { contentType: "image/jpeg" });
    const first = (fetch.calls[0]!.body as FormData).get("file") as File;
    assert.equal(first.name, "me.png");
    assert.equal(first.type, "image/png");
  });

  test("rejects unsupported or oversized images before uploading", async () => {
    const fetch = mockFetch();
    const c = client(fetch);
    await assert.rejects(c.images.upload(new Uint8Array([1, 2, 3, 4])), (e: unknown) => {
      return e instanceof ValidationError && e.code === "UNSUPPORTED_IMAGE";
    });
    const big = new Uint8Array(4 * 1024 * 1024 + 1);
    big.set(JPEG_BYTES);
    await assert.rejects(c.images.upload(big), (e: unknown) => e instanceof ValidationError && e.code === "IMAGE_TOO_LARGE");
    assert.equal(fetch.calls.length, 0);
  });
});
