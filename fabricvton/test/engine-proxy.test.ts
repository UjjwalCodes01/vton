import assert from "node:assert/strict";
import test from "node:test";

process.env.CLOTHES_PROXY_BASE = "https://proxy.example.test";
process.env.CLOTHES_PROXY_CLIENT_ID = "clothing-site";
process.env.CLOTHES_PROXY_TOKEN = "test-client-token";

const calls: Array<{ url: string; method: string; headers: Headers; body?: string }> = [];
let registration = 0;
let creation = 0;
const originalFetch = globalThis.fetch;

test("proxy retries a complete pinned upload workflow after quota exhaustion", async () => {
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    calls.push({ url, method: init?.method ?? "GET", headers, body: typeof init?.body === "string" ? init.body : undefined });
    if (url.endsWith("/v1/file")) {
      registration++;
      return new Response(JSON.stringify({
        data: { files: [{ file_id: `file-${registration}`, requests: [{
          method: "PUT", url: `https://uploads.example.test/${registration}`,
          headers: { "Content-Type": "image/jpeg", "x-amz-meta-test": "signed" },
        }] }] },
      }), { status: 200, headers: { "x-key-session": `00000000-0000-0000-0000-00000000000${registration}` } });
    }
    if (url.startsWith("https://uploads.example.test/")) return new Response(null, { status: 200 });
    if (url.endsWith("/v1/request")) {
      creation++;
      if (creation === 1) return new Response(JSON.stringify({ error: "workflow_key_exhausted_restart_upload" }), { status: 409 });
      return new Response(JSON.stringify({ data: { task_id: "task-ok" } }), { status: 200 });
    }
    throw new Error(`Unexpected URL ${url}`);
  };

  try {
    const { createTryOnWithImage, mapGarmentCategory } = await import("../app/engine.server");
    assert.equal(mapGarmentCategory("Cropped denim jacket"), "outer");
    const task = await createTryOnWithImage({
      personImage: new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }),
      garmentImageUrl: "https://images.example.test/garment.jpg",
      garmentCategory: "outerwear",
    });
    assert.equal(task.id, "task-ok");
    assert.equal(registration, 2);
    assert.equal(creation, 2);
    assert.equal(calls.filter((call) => call.method === "PUT").length, 2);
    assert.equal(calls[1]?.headers.get("x-amz-meta-test"), "signed");
    assert.equal(calls[2]?.headers.get("x-key-session"), "00000000-0000-0000-0000-000000000001");
    assert.equal(calls[5]?.headers.get("x-key-session"), "00000000-0000-0000-0000-000000000002");
    assert.equal(calls[0]?.headers.get("x-client-id"), "clothing-site");
    assert.equal(calls[0]?.headers.get("x-client-token"), "test-client-token");
    assert.equal(JSON.parse(calls[2]?.body ?? "{}").garment_category, "outer");
    assert.equal(JSON.parse(calls[5]?.body ?? "{}").garment_category, "outer");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/** A proxy that records the order of calls; the first file registration can be made to fail. */
function recordingProxy(failFirstRegistration = false) {
  const order: string[] = [];
  let files = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/v1/file")) {
      files++;
      order.push(`file-${files}`);
      if (failFirstRegistration && files === 1) return new Response(JSON.stringify({ error: "throttled" }), { status: 429 });
      assert.equal(JSON.parse(String(init?.body)).files[0].file_size, 3, "registration sends the size, never the bytes");
      return new Response(JSON.stringify({
        data: { files: [{ file_id: `file-${files}`, requests: [{ method: "PUT", url: `https://uploads.example.test/${files}` }] }] },
      }), { status: 200, headers: { "x-key-session": `00000000-0000-0000-0000-00000000000${files}` } });
    }
    if (url.startsWith("https://uploads.example.test/")) { order.push(`put-${url.split("/").pop()}`); return new Response(null, { status: 200 }); }
    if (url.endsWith("/v1/request")) { order.push("task"); return new Response(JSON.stringify({ data: { task_id: "task-ok" } }), { status: 200 }); }
    throw new Error(`Unexpected URL ${url}`);
  };
  return order;
}

test("an upload slot reserved during screening is used, with the photo PUT only afterwards", async () => {
  const order = recordingProxy();
  try {
    const { createTryOnWithImage, reserveCustomerUpload } = await import("../app/engine.server");
    const photo = new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" });
    const slot = reserveCustomerUpload(photo);
    await slot; // screening would run here
    assert.deepEqual(order, ["file-1"], "nothing but the registration before the screen passes");
    const task = await createTryOnWithImage({ personImage: photo, garmentImageUrl: "https://images.example.test/g.jpg", reservation: slot });
    assert.equal(task.id, "task-ok");
    assert.deepEqual(order, ["file-1", "put-1", "task"], "no second registration");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("an early reservation that failed is made again after screening", async () => {
  const order = recordingProxy(true);
  try {
    const { createTryOnWithImage, reserveCustomerUpload } = await import("../app/engine.server");
    const photo = new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" });
    const slot = reserveCustomerUpload(photo);
    slot.catch(() => {});
    const task = await createTryOnWithImage({ personImage: photo, garmentImageUrl: "https://images.example.test/g.jpg", reservation: slot });
    assert.equal(task.id, "task-ok");
    assert.deepEqual(order, ["file-1", "file-2", "put-2", "task"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
