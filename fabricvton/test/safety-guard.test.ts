import assert from "node:assert/strict";
import test from "node:test";

process.env.SAFETY_PROXY_BASE = "https://safety.example.test";
process.env.CLOTHES_PROXY_CLIENT_ID = "clothing-site";
process.env.CLOTHES_PROXY_TOKEN = "test-client-token";

// An 8x8 grey JPEG: the checks only need valid bytes, the screening is mocked.
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD0uiiiuA7j/9k=",
  "base64",
);
const FACE_BOX = { Left: 0.3, Top: 0.1, Width: 0.3, Height: 0.3 };
const PERSON = { Name: "Person", Confidence: 99, Instances: [{ Confidence: 99, BoundingBox: { Left: 0.1, Top: 0.05, Width: 0.8, Height: 0.95 } }] };
const originalFetch = globalThis.fetch;

type Scene = {
  low: number;
  high: number;
  faces?: number;
  people?: number;
  celebrity?: number;
  moderation?: { Name: string; ParentName?: string; Confidence: number }[];
  age?: number | null; // MiVOLO; null = no estimate
  faceSize?: number;
  guardStatus?: number;
  ageStatus?: number;
};

/**
 * One scene served both ways: as /v1/screen + /v1/age (legacy) and as
 * /v1/guard/* (guard), so the same decisions can be compared.
 */
function serve(scene: Scene) {
  const calls: string[] = [];
  const faces = Array.from({ length: scene.faces ?? 1 }, () => ({ Confidence: 99.9, AgeRange: { Low: scene.low, High: scene.high }, BoundingBox: FACE_BOX }));
  const labels = [{ ...PERSON, Instances: Array.from({ length: scene.people ?? 1 }, () => PERSON.Instances[0]) }];
  const moderation = scene.moderation ?? [];
  const celebrities = scene.celebrity ? [{ MatchConfidence: scene.celebrity }] : [];
  const age = scene.age === null ? null : { age: scene.age ?? 30, faceSize: scene.faceSize ?? 220, personUsed: true, model: "test" };
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push(url.replace("https://safety.example.test", ""));
    if (url.includes("/v1/guard/")) {
      if (scene.guardStatus && scene.guardStatus !== 200) return Response.json({ error: "guard_unavailable" }, { status: scene.guardStatus });
      if (url.endsWith("/garment")) return Response.json({ labels, moderation });
      if (url.endsWith("/output")) {
        const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
        return Response.json({ faces, labels, moderation, age, sha256: body?.url ? "a".repeat(64) : "b".repeat(64) });
      }
      return Response.json({ faces, labels, moderation, celebrities, age });
    }
    if (url.endsWith("/v1/age")) {
      if (age === null || scene.ageStatus) return Response.json({ error: "age_unavailable" }, { status: scene.ageStatus ?? 503 });
      return Response.json(age);
    }
    const action = JSON.parse(String(init?.body)).action;
    if (action === "DetectFaces") return Response.json({ FaceDetails: faces });
    if (action === "DetectLabels") return Response.json({ Labels: labels });
    if (action === "RecognizeCelebrities") return Response.json({ CelebrityFaces: celebrities });
    return Response.json({ ModerationLabels: moderation });
  };
  return calls;
}

const photo = () => new Blob([JPEG], { type: "image/jpeg" });

async function outcome(run: () => Promise<unknown>) {
  const { SafetyBlockError, SafetyUnavailableError } = await import("../app/safety.server");
  try {
    return { ok: await run() };
  } catch (error) {
    if (error instanceof SafetyBlockError) return { code: error.code, message: error.message };
    if (error instanceof SafetyUnavailableError) return { code: "unavailable" };
    throw error;
  }
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.SAFETY_GUARD_MODE;
});

const SCENES: Record<string, Scene> = {
  "young adult (challenge)": { low: 19, high: 26, age: 22.8 },
  "adult": { low: 27, high: 35, age: 31 },
  "second estimator under 18": { low: 19, high: 26, age: 16.9 },
  "Rekognition minor": { low: 12, high: 18, age: 30 },
  "estimates far apart": { low: 30, high: 38, age: 20 },
  "small face": { low: 27, high: 35, age: 30, faceSize: 50 },
  "no second estimate, young": { low: 19, high: 26, age: null },
  "no second estimate, clearly adult": { low: 24, high: 32, age: null },
  "two faces": { low: 27, high: 35, faces: 2 },
  "two people": { low: 27, high: 35, people: 2 },
  "public figure": { low: 27, high: 35, celebrity: 97 },
  "unsafe content": { low: 27, high: 35, moderation: [{ Name: "Explicit", Confidence: 80 }] },
  "swimwear on the person": { low: 27, high: 35, moderation: [{ Name: "Swimwear or Underwear", Confidence: 70 }] },
};

test("guard mode decides every person scene exactly as legacy", async () => {
  const { screenPersonImage } = await import("../app/safety.server");
  for (const [name, scene] of Object.entries(SCENES)) {
    serve(scene);
    const legacy = await outcome(() => screenPersonImage(photo()));
    process.env.SAFETY_GUARD_MODE = "guard";
    const calls = serve(scene);
    const viaGuard = await outcome(() => screenPersonImage(photo()));
    delete process.env.SAFETY_GUARD_MODE;
    assert.deepEqual(viaGuard, legacy, name);
    assert.deepEqual(calls, ["/v1/guard/person"], `${name}: one call per image`);
  }
});

test("guard mode decides output scenes exactly as legacy, via bytes or via URL", async () => {
  const { screenResultImage, screenResultUrl } = await import("../app/safety.server");
  const outputScenes = ["young adult (challenge)", "second estimator under 18", "two faces", "unsafe content", "no second estimate, young"];
  // Distinct images per scene and mode, so no approval-cache hit carries over.
  // The byte changed is inside the quantisation table (offset 30), which
  // metadata stripping keeps; trailing bytes would be stripped away.
  const variant = (n: number) => {
    const bytes = new Uint8Array(JPEG);
    bytes[30] = (bytes[30] + n) % 256;
    return bytes;
  };
  for (const [index, name] of outputScenes.entries()) {
    serve(SCENES[name]);
    const legacy = await outcome(() => screenResultImage(variant(2 * index + 1)));
    process.env.SAFETY_GUARD_MODE = "guard";
    serve(SCENES[name]);
    const viaGuard = await outcome(() => screenResultImage(variant(2 * index + 2)));
    assert.deepEqual(viaGuard, legacy, `${name} (bytes)`);
    delete process.env.SAFETY_GUARD_MODE;
  }
  process.env.SAFETY_GUARD_MODE = "guard";
  const calls = serve(SCENES["young adult (challenge)"]);
  await screenResultUrl("https://results.example.test/r.jpg");
  assert.deepEqual(calls, ["/v1/guard/output"], "the guard downloads the result itself");
});

test("garment decisions match", async () => {
  const { screenGarmentImage } = await import("../app/safety.server");
  for (const moderation of [[], [{ Name: "Swimwear or Underwear", Confidence: 70 }]]) {
    serve({ low: 30, high: 38, moderation });
    const legacy = await outcome(() => screenGarmentImage(new Uint8Array(JPEG)));
    process.env.SAFETY_GUARD_MODE = "guard";
    const calls = serve({ low: 30, high: 38, moderation });
    assert.deepEqual(await outcome(() => screenGarmentImage(new Uint8Array(JPEG))), legacy);
    assert.deepEqual(calls, ["/v1/guard/garment"]);
    delete process.env.SAFETY_GUARD_MODE;
  }
});

test("a guard failure fails closed", async () => {
  const { screenPersonImage } = await import("../app/safety.server");
  process.env.SAFETY_GUARD_MODE = "guard";
  for (const status of [503, 502, 429, 401]) {
    serve({ low: 27, high: 35, guardStatus: status });
    assert.deepEqual(await outcome(() => screenPersonImage(photo())), { code: "unavailable" });
  }
});

test("shadow mode: legacy decides, differences are logged as codes only", async () => {
  const { screenPersonImage } = await import("../app/safety.server");
  process.env.SAFETY_GUARD_MODE = "shadow";
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (message: string) => { warnings.push(message); };
  try {
    // Legacy has no age service here (falls back to the strict rule and blocks);
    // the guard has MiVOLO and would allow the young adult.
    const calls = serve({ low: 19, high: 26, age: 22.8, ageStatus: 503 });
    assert.deepEqual(await outcome(() => screenPersonImage(photo())), { code: "safety_age", message: "Please use a clear photo of an adult." });
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.ok(calls.includes("/v1/guard/person"));
    assert.deepEqual(warnings, ["[guard-shadow] person: legacy=safety_age guard=allow"]);
  } finally {
    console.warn = originalWarn;
  }
});
