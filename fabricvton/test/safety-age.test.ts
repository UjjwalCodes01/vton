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
const PERSON_BOX = { Left: 0.1, Top: 0.05, Width: 0.8, Height: 0.95 };
const originalFetch = globalThis.fetch;

type Scenario = { low: number; high: number; age?: number | "missing" | "error"; faceSize?: number };

/** Mocks the safety API: one clear face with the given Rekognition range, and MiVOLO's answer. */
function mockSafetyApi({ low, high, age = 30, faceSize = 220 }: Scenario) {
  const ageCalls: Array<Record<string, unknown>> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body));
    if (url.endsWith("/v1/age")) {
      ageCalls.push(body);
      if (age === "missing") return new Response(JSON.stringify({ message: "Not Found" }), { status: 404 });
      if (age === "error") return new Response(JSON.stringify({ error: "age_unavailable" }), { status: 503 });
      return Response.json({ age, faceSize, personUsed: true, model: "mivolo_v2@test" });
    }
    assert.ok(url.endsWith("/v1/screen"));
    if (body.action === "DetectFaces") {
      return Response.json({ FaceDetails: [{ Confidence: 99.9, AgeRange: { Low: low, High: high }, BoundingBox: FACE_BOX }] });
    }
    if (body.action === "DetectLabels") {
      return Response.json({ Labels: [{ Name: "Person", Confidence: 99, Instances: [{ Confidence: 99, BoundingBox: PERSON_BOX }] }] });
    }
    if (body.action === "RecognizeCelebrities") return Response.json({ CelebrityFaces: [] });
    return Response.json({ ModerationLabels: [] });
  };
  return ageCalls;
}

const photo = () => new Blob([JPEG], { type: "image/jpeg" });

test.afterEach(() => { globalThis.fetch = originalFetch; });

test("age bands follow policy G1", async () => {
  const { ageBand } = await import("../app/safety.server");
  // Two estimators.
  assert.equal(ageBand({ Low: 19, High: 27 }, { age: 22.5, faceSize: 300 }), "challenge");
  assert.equal(ageBand({ Low: 27, High: 35 }, { age: 29, faceSize: 300 }), "adult");
  assert.equal(ageBand({ Low: 26, High: 34 }, { age: 24, faceSize: 300 }), "challenge"); // the minimum decides
  assert.equal(ageBand({ Low: 19, High: 27 }, { age: 17.4, faceSize: 300 }), "minor");
  assert.equal(ageBand({ Low: 15, High: 25 }, { age: 30, faceSize: 300 }), "minor"); // low under 16
  assert.equal(ageBand({ Low: 13, High: 19 }, { age: 25, faceSize: 300 }), "minor"); // midpoint 16
  assert.equal(ageBand({ Low: 30, High: 38 }, { age: 21, faceSize: 300 }), "unknown"); // 13 years apart
  assert.equal(ageBand({ Low: 27, High: 35 }, { age: 30, faceSize: 60 }), "unknown"); // face too small
  assert.equal(ageBand(undefined, { age: 30, faceSize: 300 }), "unknown");
  // One estimator: the September stopgap, nothing in the challenge band passes.
  assert.equal(ageBand({ Low: 19, High: 27 }, null), "unknown");
  assert.equal(ageBand({ Low: 17, High: 35 }, null), "unknown");
  assert.equal(ageBand({ Low: 22, High: 30 }, null), "adult");
});

test("a young adult with both estimates 18+ is accepted as challenge", async () => {
  const { screenPersonImage } = await import("../app/safety.server");
  const ageCalls = mockSafetyApi({ low: 19, high: 26, age: 22.8 });
  assert.equal(await screenPersonImage(photo()), "challenge");
  assert.equal(ageCalls.length, 1);
  assert.deepEqual(ageCalls[0].face, FACE_BOX);
  assert.deepEqual(ageCalls[0].person, PERSON_BOX);
});

test("the second estimator saying under 18 blocks", async () => {
  const { screenPersonImage, SafetyBlockError } = await import("../app/safety.server");
  mockSafetyApi({ low: 19, high: 26, age: 16.9 });
  await assert.rejects(screenPersonImage(photo()), (error: unknown) =>
    error instanceof SafetyBlockError && error.code === "safety_age");
});

test("a Rekognition minor reading blocks without asking the second estimator", async () => {
  const { screenPersonImage, SafetyBlockError } = await import("../app/safety.server");
  const ageCalls = mockSafetyApi({ low: 12, high: 18, age: 30 });
  await assert.rejects(screenPersonImage(photo()), (error: unknown) =>
    error instanceof SafetyBlockError && error.code === "safety_age");
  assert.equal(ageCalls.length, 0);
});

test("estimates far apart ask for a clearer photo", async () => {
  const { screenPersonImage, SafetyBlockError } = await import("../app/safety.server");
  mockSafetyApi({ low: 30, high: 38, age: 20 });
  await assert.rejects(screenPersonImage(photo()), (error: unknown) =>
    error instanceof SafetyBlockError && error.code === "safety_age" && /front-facing/.test(error.message));
});

test("without the age service the stopgap applies: stricter, never looser", async () => {
  const { screenPersonImage, SafetyBlockError } = await import("../app/safety.server");
  for (const age of ["missing", "error"] as const) {
    mockSafetyApi({ low: 19, high: 26, age });
    await assert.rejects(screenPersonImage(photo()), (error: unknown) =>
      error instanceof SafetyBlockError && error.code === "safety_age");
    mockSafetyApi({ low: 24, high: 32, age });
    assert.equal(await screenPersonImage(photo()), "adult");
  }
});

test("generated output gets the same two-estimator check", async () => {
  const { screenResultImage, SafetyBlockError } = await import("../app/safety.server");
  const ageCalls = mockSafetyApi({ low: 19, high: 26, age: 23 });
  await screenResultImage(new Uint8Array(JPEG));
  assert.equal(ageCalls.length, 1);
  mockSafetyApi({ low: 19, high: 26, age: 15 });
  const other = new Uint8Array(JPEG.length + 2);
  other.set(JPEG); // different bytes: not served from the approval cache
  other.set([0xff, 0xd9], JPEG.length);
  await assert.rejects(screenResultImage(other), (error: unknown) =>
    error instanceof SafetyBlockError && error.code === "safety_age");
});
