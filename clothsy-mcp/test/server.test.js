// End-to-end tests: spawn the real server over stdio and speak MCP to it.
// No real network: tests either stop before any request or point the server
// at a local mock API with CLOTHSY_BASE_URL.

import { spawn } from "node:child_process";
import { createServer as createHttpServer } from "node:http";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const ENTRY = fileURLToPath(new URL("../src/index.js", import.meta.url));
const VALID_KEY = `clothsy_live_${"A".repeat(40)}b_-`; // 13 + 43 characters
const UNREACHABLE = "http://127.0.0.1:9"; // guards against accidental real requests

/**
 * Start the server with a controlled environment and return a small client.
 * @param {Record<string, string>} [extraEnv]
 */
function startServer(extraEnv = {}) {
  /** @type {Record<string, string | undefined>} */
  const env = { ...process.env, CLOTHSY_BASE_URL: UNREACHABLE, ...extraEnv };
  delete env.CLOTHSY_DEBUG;
  if (!("CLOTHSY_API_KEY" in extraEnv)) delete env.CLOTHSY_API_KEY;
  const child = spawn(process.execPath, [ENTRY], { env, stdio: ["pipe", "pipe", "pipe"] });
  /** @type {Map<unknown, (msg: any) => void>} */
  const waiting = new Map();
  /** @type {any[]} */
  const unmatched = [];
  let stderr = "";
  let buffer = "";
  child.stderr.on("data", (d) => (stderr += d));
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let i;
    while ((i = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, i);
      buffer = buffer.slice(i + 1);
      if (!line.trim()) continue;
      const msg = JSON.parse(line); // every stdout line must be valid JSON
      const resolve = waiting.get(msg.id);
      if (resolve) {
        waiting.delete(msg.id);
        resolve(msg);
      } else unmatched.push(msg);
    }
  });
  let nextId = 1;
  const exited = new Promise((resolve) => child.on("exit", (code) => resolve(code)));

  return {
    child,
    exited,
    unmatched,
    get stderr() {
      return stderr;
    },
    /** @param {string} line */
    writeRaw(line) {
      child.stdin.write(`${line}\n`);
    },
    /**
     * @param {string} method
     * @param {unknown} [params]
     * @param {number} [timeoutMs]
     */
    request(method, params, timeoutMs = 10_000) {
      const id = nextId++;
      return this.requestWithId(id, method, params, timeoutMs);
    },
    /**
     * @param {unknown} id
     * @param {string} method
     * @param {unknown} [params]
     * @param {number} [timeoutMs]
     */
    requestWithId(id, method, params, timeoutMs = 10_000) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), timeoutMs);
        waiting.set(id, (msg) => {
          clearTimeout(timer);
          resolve(msg);
        });
        /** @type {Record<string, unknown>} */
        const msg = { jsonrpc: "2.0", id, method };
        if (params !== undefined) msg.params = params;
        child.stdin.write(`${JSON.stringify(msg)}\n`);
      });
    },
    /** @param {unknown} id @param {number} [timeoutMs] */
    waitFor(id, timeoutMs = 5_000) {
      const found = unmatched.findIndex((m) => m.id === id);
      if (found !== -1) return Promise.resolve(unmatched.splice(found, 1)[0]);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timeout waiting for id ${String(id)}`)), timeoutMs);
        waiting.set(id, (msg) => {
          clearTimeout(timer);
          resolve(msg);
        });
      });
    },
    /** @param {string} method @param {unknown} [params] */
    notify(method, params) {
      /** @type {Record<string, unknown>} */
      const msg = { jsonrpc: "2.0", method };
      if (params !== undefined) msg.params = params;
      child.stdin.write(`${JSON.stringify(msg)}\n`);
    },
    async handshake(protocolVersion = "2025-06-18") {
      const res = await this.request("initialize", {
        protocolVersion,
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" },
      });
      this.notify("notifications/initialized");
      return res;
    },
    /** @param {string} name @param {Record<string, unknown>} [args] @param {number} [timeoutMs] */
    async callTool(name, args = {}, timeoutMs) {
      const res = await this.request("tools/call", { name, arguments: args }, timeoutMs);
      assert.equal(res.error, undefined, `tools/call ${name} returned a protocol error: ${JSON.stringify(res.error)}`);
      return res.result;
    },
    async close() {
      child.stdin.end();
      return exited;
    },
  };
}

/** @param {any} result */
function textOf(result) {
  assert.ok(Array.isArray(result.content), "result.content must be an array");
  assert.equal(result.content[0].type, "text");
  return result.content.map((/** @type {any} */ c) => c.text).join("\n");
}

describe("protocol", () => {
  /** @type {ReturnType<typeof startServer>} */
  let s;
  before(() => {
    s = startServer();
  });
  after(async () => {
    await s.close();
  });

  test("initialize echoes a supported protocol version and declares capabilities", async () => {
    const res = await s.handshake("2025-03-26");
    assert.equal(res.jsonrpc, "2.0");
    assert.equal(res.result.protocolVersion, "2025-03-26");
    assert.deepEqual(res.result.capabilities, { tools: {}, resources: {}, prompts: {} });
    assert.deepEqual(res.result.serverInfo, { name: "clothsy-mcp", version: "0.1.0" });
    assert.match(res.result.instructions, /clothsy_detect_stack/);
  });

  test("initialize falls back to 2025-06-18 for unknown versions", async () => {
    const res = await s.request("initialize", { protocolVersion: "1999-01-01", capabilities: {}, clientInfo: { name: "x", version: "0" } });
    assert.equal(res.result.protocolVersion, "2025-06-18");
    const old = await s.request("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "x", version: "0" } });
    assert.equal(old.result.protocolVersion, "2024-11-05");
  });

  test("ping", async () => {
    const res = await s.request("ping");
    assert.deepEqual(res.result, {});
  });

  test("tools/list returns 6 tools with valid JSON Schemas", async () => {
    const res = await s.request("tools/list");
    const tools = res.result.tools;
    assert.equal(tools.length, 6);
    assert.deepEqual(
      tools.map((/** @type {any} */ t) => t.name).sort(),
      [
        "clothsy_check_setup",
        "clothsy_detect_stack",
        "clothsy_docs",
        "clothsy_explain_error",
        "clothsy_integration_plan",
        "clothsy_test_tryon",
      ],
    );
    for (const tool of tools) {
      assert.match(tool.name, /^[a-z][a-z0-9_]*$/);
      assert.ok(tool.description.length > 40, `${tool.name} needs a real description`);
      const schema = tool.inputSchema;
      assert.equal(schema.type, "object", `${tool.name} schema must be an object`);
      assert.equal(typeof schema.properties, "object");
      for (const req of schema.required ?? []) assert.ok(req in schema.properties, `${tool.name}: required ${req} not in properties`);
      for (const [prop, def] of Object.entries(schema.properties)) {
        assert.ok(["string", "boolean", "integer", "number"].includes(/** @type {any} */ (def).type), `${tool.name}.${prop} has a type`);
        assert.ok(/** @type {any} */ (def).description, `${tool.name}.${prop} has a description`);
      }
      assert.doesNotThrow(() => JSON.parse(JSON.stringify(schema)));
    }
    const checkSetup = tools.find((/** @type {any} */ t) => t.name === "clothsy_check_setup");
    assert.deepEqual(Object.keys(checkSetup.inputSchema.properties), [], "check_setup must not accept a key argument");
  });

  test("unknown method -> -32601", async () => {
    const res = await s.request("does/not/exist");
    assert.equal(res.error.code, -32601);
  });

  test("malformed JSON -> -32700 with null id, and the server keeps working", async () => {
    s.writeRaw("{this is not json");
    const res = await s.waitFor(null);
    assert.equal(res.error.code, -32700);
    const ping = await s.request("ping");
    assert.deepEqual(ping.result, {});
  });

  test("invalid request object -> -32600", async () => {
    s.writeRaw(JSON.stringify({ jsonrpc: "1.0", id: "bad", method: "ping" }));
    const res = await s.waitFor("bad");
    assert.equal(res.error.code, -32600);
  });

  test("notifications get no reply (unknown ones included)", async () => {
    s.notify("notifications/something_else", {});
    s.notify("notifications/initialized");
    const ping = await s.request("ping");
    assert.deepEqual(ping.result, {});
    assert.equal(s.unmatched.filter((m) => m.id === undefined).length, 0);
  });

  test("unknown tool is a -32602 protocol error", async () => {
    const res = await s.request("tools/call", { name: "nope", arguments: {} });
    assert.equal(res.error.code, -32602);
  });

  test("bad arguments are a tool error, not a protocol error", async () => {
    const result = await s.callTool("clothsy_integration_plan", { stack: "cobol" });
    assert.equal(result.isError, true);
    assert.match(textOf(result), /must be one of: nextjs, node, python, http/);
    const extra = await s.callTool("clothsy_check_setup", { apiKey: "clothsy_live_x" });
    assert.equal(extra.isError, true);
    assert.match(textOf(extra), /Unknown argument `apiKey`/);
  });

  test("string ids are echoed", async () => {
    const res = await s.requestWithId("abc-123", "ping");
    assert.equal(res.id, "abc-123");
  });
});

describe("tools (offline)", () => {
  /** @type {ReturnType<typeof startServer>} */
  let s;
  before(async () => {
    s = startServer();
    await s.handshake();
  });
  after(async () => {
    await s.close();
  });

  test("detect_stack: Next.js package.json -> nextjs", async () => {
    const pkg = JSON.stringify({ name: "shop", dependencies: { next: "15.1.0", react: "19.0.0", "react-dom": "19.0.0" } });
    const result = await s.callTool("clothsy_detect_stack", { packageJson: pkg });
    assert.notEqual(result.isError, true);
    const text = textOf(result);
    assert.match(text, /Next\.js/);
    assert.match(text, /"stack":"nextjs"/);
  });

  test("detect_stack: platform stores get the app/plugin", async () => {
    const shopify = textOf(await s.callTool("clothsy_detect_stack", { projectDescription: "Our Shopify store with the Dawn theme" }));
    assert.match(shopify, /"path":"shopify-app"/);
    assert.match(shopify, /apps\.shopify\.com\/fabricvton/);
    const woo = textOf(await s.callTool("clothsy_detect_stack", { projectDescription: "WooCommerce shop on WordPress" }));
    assert.match(woo, /"path":"woocommerce-plugin"/);
    assert.match(woo, /wordpress\.org\/plugins\/clothsy-ai/);
  });

  test("detect_stack: other stacks", async () => {
    const express = textOf(await s.callTool("clothsy_detect_stack", { packageJson: JSON.stringify({ dependencies: { express: "^4.19.0" } }) }));
    assert.match(express, /"stack":"node"/);
    const django = textOf(await s.callTool("clothsy_detect_stack", { projectDescription: "A Django shop" }));
    assert.match(django, /"stack":"python"/);
    const laravel = textOf(await s.callTool("clothsy_detect_stack", { projectDescription: "Laravel store", packageJson: JSON.stringify({ devDependencies: { vite: "^5" } }) }));
    assert.match(laravel, /"stack":"http"/);
    const headless = textOf(await s.callTool("clothsy_detect_stack", { projectDescription: "Headless Shopify storefront in Next.js" }));
    assert.match(headless, /"stack":"nextjs"/);
    const vite = textOf(await s.callTool("clothsy_detect_stack", { packageJson: JSON.stringify({ dependencies: { vite: "^5", react: "^18" } }) }));
    assert.match(vite, /"stack":"node"/);
    assert.match(vite, /can't be kept secret/);
    const unknown = textOf(await s.callTool("clothsy_detect_stack", {}));
    assert.match(unknown, /"path":"unknown"/);
    const bad = textOf(await s.callTool("clothsy_detect_stack", { packageJson: "{nope" }));
    assert.match(bad, /isn't valid JSON/);
  });

  test("integration_plan: nextjs contains the route, button, env and checklist", async () => {
    const result = await s.callTool("clothsy_integration_plan", { stack: "nextjs", productLookup: "Prisma Product model, images on Cloudinary */ evil" });
    assert.notEqual(result.isError, true);
    const text = textOf(result);
    assert.match(text, /### `app\/api\/tryon\/route\.ts` \(create\)/);
    assert.match(text, /import \{ createTryOnRoute \} from "clothsy-ai\/next";/);
    assert.match(text, /export const \{ POST, GET \} = createTryOnRoute\(/);
    assert.match(text, /export const maxDuration = 60;/);
    assert.match(text, /"use client";/);
    assert.match(text, /import \{ TryOnButton \} from "clothsy-ai\/react";/);
    assert.match(text, /<TryOnButton productId=\{productId\} endpoint="\/api\/tryon" label="Try it on" \/>/);
    assert.match(text, /CLOTHSY_API_KEY=clothsy_live_\.\.\./);
    assert.match(text, /NEXT_PUBLIC_/);
    assert.match(text, /## Verification checklist/);
    assert.match(text, /Prisma Product model/);
    assert.doesNotMatch(text, /\{\{[A-Z_]+\}\}/, "no unreplaced template placeholders");
    assert.match(text, / \* The store's products come from: Prisma Product model, images on Cloudinary \* \/ evil\n/, "comment terminators are neutralised in code");
  });

  test("integration_plan: every stack renders without placeholders", async () => {
    for (const stack of ["node", "python", "http"]) {
      const text = textOf(await s.callTool("clothsy_integration_plan", { stack }));
      assert.doesNotMatch(text, /\{\{[A-Z_]+\}\}/, stack);
      assert.match(text, /## Verification checklist/, stack);
      assert.match(text, /fabricvton-api\.onrender\.com\/api\/v1|clothsy-ai/, stack);
    }
    const node = textOf(await s.callTool("clothsy_integration_plan", { stack: "node" }));
    assert.match(node, /multer/);
    assert.match(node, /clothsy\.images\.upload/);
    assert.match(node, /clothsy\.tryons\.create/);
    assert.match(node, /1600/);
    const py = textOf(await s.callTool("clothsy_integration_plan", { stack: "python" }));
    assert.match(py, /from flask import/);
    assert.match(py, /Idempotency-Key/);
    const http = textOf(await s.callTool("clothsy_integration_plan", { stack: "http" }));
    assert.match(http, /curl -sS -X POST "\$API\/images"/);
  });

  test("docs: every topic returns markdown", async () => {
    const topics = ["overview", "auth", "sdk", "nextjs", "endpoints", "errors", "limits", "images", "consent-privacy", "ai-label"];
    for (const topic of topics) {
      const result = await s.callTool("clothsy_docs", { topic });
      assert.notEqual(result.isError, true, topic);
      assert.match(textOf(result), /^# /, topic);
    }
    const errors = textOf(await s.callTool("clothsy_docs", { topic: "errors" }));
    assert.match(errors, /\| 422 \| `PERSON_PHOTO_REJECTED` \|/);
    assert.doesNotMatch(errors, /\{\{ERROR_TABLE\}\}/);
  });

  test("explain_error: PERSON_PHOTO_REJECTED", async () => {
    const result = await s.callTool("clothsy_explain_error", { code: "PERSON_PHOTO_REJECTED" });
    assert.notEqual(result.isError, true);
    const text = textOf(result);
    assert.match(text, /HTTP 422/);
    assert.match(text, /exactly one adult/);
    assert.match(text, /printed on clothing/);
    assert.match(text, /\*\*Retry:\*\* Not unchanged/);
  });

  test("explain_error: by status, by message, lowercase code, and unknown", async () => {
    const byStatus = textOf(await s.callTool("clothsy_explain_error", { httpStatus: 422 }));
    assert.match(byStatus, /3 different codes/);
    const byMessage = textOf(await s.callTool("clothsy_explain_error", { message: "ClothsyError: RATE_LIMITED (429)" }));
    assert.match(byMessage, /## RATE_LIMITED/);
    assert.match(byMessage, /Retry-After/);
    const lower = textOf(await s.callTool("clothsy_explain_error", { code: "start-failed" }));
    assert.match(lower, /No credit was used/);
    const unknown = await s.callTool("clothsy_explain_error", { code: "WHAT_IS_THIS" });
    assert.match(textOf(unknown), /No known Clothsy error/);
    const empty = await s.callTool("clothsy_explain_error", {});
    assert.equal(empty.isError, true);
  });

  test("check_setup without a key -> isError with config guidance", async () => {
    const result = await s.callTool("clothsy_check_setup");
    assert.equal(result.isError, true);
    const text = textOf(result);
    assert.match(text, /CLOTHSY_API_KEY isn't set/);
    assert.match(text, /claude mcp add clothsy --env CLOTHSY_API_KEY=/);
    assert.match(text, /\.cursor\/mcp\.json/);
    assert.match(text, /\.vscode\/mcp\.json/);
    assert.match(text, /claude_desktop_config\.json/);
  });

  test("test_tryon without confirmSpend does nothing", async () => {
    const result = await s.callTool("clothsy_test_tryon", {
      personImageUrl: "https://example.com/person.jpg",
      garmentImageUrl: "https://example.com/jacket.jpg",
      confirmSpend: false,
    });
    assert.equal(result.isError, true);
    const text = textOf(result);
    assert.match(text, /Not run/);
    assert.match(text, /1 credit/);
    assert.match(text, /consenting adult/);
  });

  test("test_tryon rejects non-HTTPS URLs before spending", async () => {
    const result = await s.callTool("clothsy_test_tryon", {
      personImageUrl: "http://example.com/person.jpg",
      garmentImageUrl: "https://localhost/jacket.jpg",
      confirmSpend: true,
    });
    assert.equal(result.isError, true);
    assert.match(textOf(result), /must use https/);
    assert.match(textOf(result), /private\/local address/);
  });

  test("resources/list and resources/read", async () => {
    const list = await s.request("resources/list");
    const resources = list.result.resources;
    assert.equal(resources.length, 10);
    for (const r of resources) {
      assert.match(r.uri, /^clothsy:\/\/docs\/[a-z-]+$/);
      assert.equal(r.mimeType, "text/markdown");
    }
    const read = await s.request("resources/read", { uri: "clothsy://docs/sdk" });
    assert.equal(read.result.contents[0].uri, "clothsy://docs/sdk");
    assert.equal(read.result.contents[0].mimeType, "text/markdown");
    assert.match(read.result.contents[0].text, /tryons\.waitFor/);
    const missing = await s.request("resources/read", { uri: "clothsy://docs/nope" });
    assert.ok(missing.error);
  });

  test("prompts/list and prompts/get", async () => {
    const list = await s.request("prompts/list");
    assert.equal(list.result.prompts[0].name, "add_clothsy_tryon");
    assert.equal(list.result.prompts[0].arguments[0].name, "stack");
    const detect = await s.request("prompts/get", { name: "add_clothsy_tryon" });
    const msg = detect.result.messages[0];
    assert.equal(msg.role, "user");
    assert.equal(msg.content.type, "text");
    assert.match(msg.content.text, /clothsy_detect_stack/);
    assert.match(msg.content.text, /clothsy_integration_plan/);
    assert.match(msg.content.text, /clothsy_check_setup/);
    assert.match(msg.content.text, /server-side/);
    const withStack = await s.request("prompts/get", { name: "add_clothsy_tryon", arguments: { stack: "nextjs" } });
    assert.match(withStack.result.messages[0].content.text, /"stack": "nextjs"/);
    const unknown = await s.request("prompts/get", { name: "nope" });
    assert.equal(unknown.error.code, -32602);
  });

  test("nothing but JSON-RPC ever reaches stdout", () => {
    for (const m of s.unmatched) assert.equal(m.jsonrpc, "2.0");
  });
});

describe("check_setup with an invalid-format key", () => {
  test("reports the format problem without sending a request or echoing the key", async () => {
    const secretish = "clothsy_live_TOO_SHORT_SECRET_PART";
    const s = startServer({ CLOTHSY_API_KEY: secretish });
    await s.handshake();
    const result = await s.callTool("clothsy_check_setup");
    assert.equal(result.isError, true);
    const text = textOf(result);
    assert.match(text, /doesn't look like a Clothsy key/);
    assert.match(text, /clothsy_live_…/);
    assert.match(text, /No request was sent/);
    assert.doesNotMatch(text, /TOO_SHORT_SECRET_PART/);
    await s.close();
  });
});

describe("against a local mock API", () => {
  /** @type {import("node:http").Server} */
  let api;
  let baseUrl = "";
  /** @type {{ method?: string, url?: string, headers: import("node:http").IncomingHttpHeaders, body: string }[]} */
  const seen = [];
  let polls = 0;

  before(async () => {
    api = createHttpServer((req, res) => {
      let body = "";
      req.on("data", (d) => (body += d));
      req.on("end", () => {
        seen.push({ method: req.method, url: req.url, headers: req.headers, body });
        const send = (/** @type {number} */ status, /** @type {unknown} */ json) => {
          res.writeHead(status, { "Content-Type": "application/json" });
          res.end(JSON.stringify(json));
        };
        if (req.headers.authorization !== `Bearer ${VALID_KEY}`) return send(401, { error: "Invalid API key.", code: "INVALID_API_KEY" });
        if (req.method === "GET" && req.url === "/api/v1/account") return send(200, { credits: 17 });
        if (req.method === "POST" && req.url === "/api/v1/tryons/sync") return send(202, { id: "tryon_test1", status: "pending" });
        if (req.method === "GET" && req.url === "/api/v1/tryons/tryon_test1") {
          polls++;
          return send(200, { id: "tryon_test1", status: "success", resultUrl: "https://example.com/result.jpg" });
        }
        send(404, { error: "Not found.", code: "NOT_FOUND" });
      });
    });
    await new Promise((resolve) => api.listen(0, "127.0.0.1", () => resolve(undefined)));
    const addr = /** @type {import("node:net").AddressInfo} */ (api.address());
    baseUrl = `http://127.0.0.1:${addr.port}/api/v1`;
  });
  after(() => api.close());

  test("check_setup with a valid key reports credits and masks the key", async () => {
    const s = startServer({ CLOTHSY_API_KEY: VALID_KEY, CLOTHSY_BASE_URL: baseUrl });
    await s.handshake();
    const result = await s.callTool("clothsy_check_setup");
    assert.notEqual(result.isError, true);
    const text = textOf(result);
    assert.match(text, /Credits remaining: 17/);
    assert.match(text, /clothsy_live_…/);
    assert.ok(!text.includes(VALID_KEY.slice(13)), "the secret part of the key must never be echoed");
    await s.close();
  });

  test("check_setup with a revoked key explains INVALID_API_KEY", async () => {
    const revoked = `clothsy_live_${"z".repeat(43)}`;
    const s = startServer({ CLOTHSY_API_KEY: revoked, CLOTHSY_BASE_URL: baseUrl });
    await s.handshake();
    const result = await s.callTool("clothsy_check_setup");
    assert.equal(result.isError, true);
    assert.match(textOf(result), /INVALID_API_KEY/);
    assert.ok(!textOf(result).includes("z".repeat(43)));
    await s.close();
  });

  test("test_tryon with confirmSpend runs sync then polls", async () => {
    const s = startServer({ CLOTHSY_API_KEY: VALID_KEY, CLOTHSY_BASE_URL: baseUrl });
    await s.handshake();
    const result = await s.callTool(
      "clothsy_test_tryon",
      {
        personImageUrl: "https://example.com/person.jpg",
        garmentImageUrl: "https://example.com/jacket.jpg",
        title: "Cropped denim jacket",
        confirmSpend: true,
      },
      20_000,
    );
    assert.notEqual(result.isError, true, textOf(result));
    const text = textOf(result);
    assert.match(text, /Status: success/);
    assert.match(text, /resultUrl: https:\/\/example\.com\/result\.jpg/);
    assert.match(text, /Elapsed: \d+\.\d s/);
    assert.equal(polls, 1);
    const start = seen.find((r) => r.url === "/api/v1/tryons/sync");
    assert.ok(start);
    assert.match(String(start.headers["idempotency-key"]), /^[A-Za-z0-9_-]{8,128}$/);
    assert.deepEqual(JSON.parse(start.body), {
      personImageUrl: "https://example.com/person.jpg",
      garmentImageUrl: "https://example.com/jacket.jpg",
      consent: true,
      title: "Cropped denim jacket",
    });
    await s.close();
  });
});

describe("lifecycle", () => {
  test("exits cleanly when stdin ends", async () => {
    const s = startServer();
    await s.handshake();
    const code = await s.close();
    assert.equal(code, 0);
    assert.equal(s.stderr, "");
  });

  test("--version prints the version", async () => {
    const child = spawn(process.execPath, [ENTRY, "--version"]);
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    const code = await new Promise((resolve) => child.on("exit", resolve));
    assert.equal(code, 0);
    assert.equal(out.trim(), "0.1.0");
  });
});
