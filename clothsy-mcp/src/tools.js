import { apiRequest, baseUrlFrom, newIdempotencyKey, sleep } from "./api.js";
import { detectStack } from "./detect.js";
import {
  API_BASE_URL,
  DOCS_URL,
  KEY_PATTERN,
  KEY_PREFIX,
  PLATFORM_URL,
  TOPICS,
  TOPIC_TITLES,
  docsFor,
  errorsForStatus,
  findError,
  maskKey,
} from "./knowledge.js";
import { integrationPlan } from "./plans.js";
import { errorResult, textResult } from "./protocol.js";

export const SERVER_NAME = "clothsy-mcp";
export const SERVER_VERSION = "0.1.0";

export const INSTRUCTIONS = `This server helps you add Clothsy AI virtual try-on (shoppers see garments on a photo of themselves) to a store or app.

Use it when the user wants virtual try-on / "try it on" / AI fitting-room features, mentions Clothsy, or hits a Clothsy API error.

Typical flow:
1. clothsy_detect_stack with the project's package.json and/or a short description. Shopify and WooCommerce stores should install the app/plugin (no code); custom storefronts use the SDK or HTTP API.
2. clothsy_integration_plan for the recommended stack, then implement every file it lists, adapting paths and the product lookup to the codebase.
3. clothsy_check_setup to verify the CLOTHSY_API_KEY configured for this server and see remaining credits.
4. Optionally clothsy_test_tryon for one live try-on (costs 1 credit; only with the user's explicit OK).
Use clothsy_docs (or the clothsy://docs/* resources) for reference, and clothsy_explain_error for any error code.

Always: keep the API key server-side (never in browser code or NEXT_PUBLIC_/VITE_ vars, never committed), resolve garment images from the store's catalogue on the server, collect explicit consent from an adult before sending a photo, and caption results as AI-generated. Never ask the user to paste their API key into the chat.`;

/** @param {Record<string, string | undefined>} env */
function readKey(env) {
  const raw = env.CLOTHSY_API_KEY;
  if (raw === undefined || raw.trim() === "") return { state: /** @type {const} */ ("missing") };
  const trimmed = raw.trim().replace(/^["']|["']$/g, "");
  if (!KEY_PATTERN.test(trimmed)) return { state: /** @type {const} */ ("malformed"), raw };
  return { state: /** @type {const} */ ("ok"), key: trimmed };
}

const HOW_TO_SET_KEY = `How to give this MCP server the key (it only reads its own environment; never paste the key into the chat):

- Claude Code: \`claude mcp add clothsy --env CLOTHSY_API_KEY=clothsy_live_... -- npx -y clothsy-mcp\` (or edit the "env" block of the clothsy entry in .mcp.json / ~/.claude.json, referencing a shell variable such as "\${CLOTHSY_API_KEY}").
- Cursor: in ~/.cursor/mcp.json or .cursor/mcp.json, add "env": { "CLOTHSY_API_KEY": "..." } to the clothsy server.
- VS Code: in .vscode/mcp.json use an input variable so the key isn't committed: "env": { "CLOTHSY_API_KEY": "\${input:clothsy-key}" } with a matching "inputs" entry ({ "type": "promptString", "id": "clothsy-key", "password": true }).
- Windsurf: ~/.codeium/windsurf/mcp_config.json, "env" block of the clothsy server.
- Claude Desktop: claude_desktop_config.json, "env" block of the clothsy server.

Then restart the MCP server (or the client) so it picks up the new environment.

Get a key at ${PLATFORM_URL} -> Developer API (the first key adds 20 free credits). Keep project-level config files with real keys out of git.`;

/**
 * @param {import("./api.js").ApiResponse & { ok: false }} res
 */
function describeApiFailure(res) {
  if (res.status === 0) {
    if (res.code === "TIMEOUT") return `The API didn't answer in time (${res.message}). It may be waking up or busy; try again in a minute.`;
    if (res.code === "ABORTED") return "The request was cancelled.";
    return `${res.message} Check this machine's internet connection and that outbound HTTPS to ${new URL(API_BASE_URL).host} is allowed.`;
  }
  const info = findError(res.code);
  const lines = [`HTTP ${res.status} ${res.code}: ${res.message}`];
  if (info) {
    lines.push(`Meaning: ${info.meaning}`, `Likely cause: ${info.cause}`, `Fix: ${info.fix}`, `Retry: ${info.retryNote}`);
  }
  if (res.retryAfter !== undefined) lines.push(`Retry-After: ${res.retryAfter} s`);
  return lines.join("\n");
}

/** @type {import("./protocol.js").Tool[]} */
export const TOOLS = [
  {
    name: "clothsy_detect_stack",
    title: "Detect stack and recommend a Clothsy integration",
    description:
      "Recommend how to add Clothsy AI virtual try-on to a project. Pass the project's package.json contents and/or a short description (framework, commerce platform, backend language, where products come from). Returns the recommended path (install the Shopify app or WooCommerce plugin; Next.js SDK helper + TryOnButton; Node SDK + two routes; Python; raw HTTP) with reasons, and the `stack` value to pass to clothsy_integration_plan. Pure logic, no network. Call this first.",
    inputSchema: {
      type: "object",
      properties: {
        projectDescription: {
          type: "string",
          maxLength: 4000,
          description: "Free text about the project, e.g. \"Next.js 15 App Router storefront, products in Postgres via Prisma\" or \"Django shop\" or \"Shopify store\".",
        },
        packageJson: {
          type: "string",
          maxLength: 200000,
          description: "The raw contents of the project's package.json, if it has one.",
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler(args) {
      const { detection, warnings } = detectStack(args);
      const pathLabel = {
        "shopify-app": "Install the Clothsy AI Shopify app (no code)",
        "woocommerce-plugin": "Install the Clothsy AI WordPress plugin (no code)",
        nextjs: "Next.js: clothsy-ai/next route helper + clothsy-ai/react TryOnButton",
        node: "Node.js: clothsy-ai SDK + two server routes of your own",
        python: "Python: HTTP API from your server (Flask/Django/FastAPI)",
        http: "HTTP API from your server",
        unknown: "Not sure yet",
      }[detection.path];
      const lines = [
        `# Recommendation: ${pathLabel}`,
        "",
        `Confidence: ${detection.confidence}`,
        "",
        "## Why",
        ...detection.reasons.map((r) => `- ${r}`),
      ];
      if (detection.notes.length) lines.push("", "## Notes", ...detection.notes.map((n) => `- ${n}`));
      if (warnings.length) lines.push("", "## Input warnings", ...warnings.map((w) => `- ${w}`));
      lines.push("", "## Next step");
      if (detection.stack) {
        lines.push(`Call \`clothsy_integration_plan\` with \`{ "stack": "${detection.stack}" }\` and, if you know it, \`productLookup\` (how the store loads products, e.g. "Prisma Product model, images in Cloudinary").`);
      } else if (detection.path === "unknown") {
        lines.push("Call this tool again with more detail.");
      } else {
        lines.push("No code is needed. If the store is actually headless / a custom front end, describe that and call this tool again.");
      }
      lines.push("", `\`\`\`json\n${JSON.stringify({ path: detection.path, stack: detection.stack, confidence: detection.confidence })}\n\`\`\``);
      return textResult(lines.join("\n"));
    },
  },

  {
    name: "clothsy_integration_plan",
    title: "Get a step-by-step Clothsy integration plan",
    description:
      "Return an ordered, copy-ready plan for adding Clothsy AI try-on to a custom store: every file to create or modify with full contents, env var setup, rules, and a verification checklist. stack: \"nextjs\" (App Router route via clothsy-ai/next + TryOnButton), \"node\" (Express + clothsy-ai SDK + browser script), \"python\" (Flask + HTTP API), \"http\" (raw curl sequence + browser script). Adapt file paths and the product lookup to the codebase when implementing.",
    inputSchema: {
      type: "object",
      properties: {
        stack: {
          type: "string",
          enum: ["nextjs", "node", "python", "http"],
          description: "Integration stack, usually the `stack` returned by clothsy_detect_stack.",
        },
        productLookup: {
          type: "string",
          maxLength: 1000,
          description: "Optional: how the store fetches products and their images, e.g. \"getProductBySlug() in lib/shopify.ts\" or \"Django Product model with image field on S3\".",
        },
      },
      required: ["stack"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler(args) {
      return textResult(integrationPlan(args.stack, args.productLookup));
    },
  },

  {
    name: "clothsy_docs",
    title: "Read Clothsy AI documentation",
    description: `Return one section of the Clothsy AI try-on documentation as markdown. Topics: ${TOPICS.map((t) => `"${t}" (${TOPIC_TITLES[t]})`).join(", ")}.`,
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", enum: [...TOPICS], description: "Which documentation section to return." },
      },
      required: ["topic"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler(args) {
      return textResult(docsFor(args.topic));
    },
  },

  {
    name: "clothsy_explain_error",
    title: "Explain a Clothsy API error",
    description:
      "Explain a Clothsy AI API or SDK error: what it means, the likely cause, the exact fix and whether to retry. Pass the error `code` (e.g. PERSON_PHOTO_REJECTED, from the JSON body or the SDK error's .code), and/or the HTTP status and message. No network.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", maxLength: 100, description: "Error code, e.g. \"INSUFFICIENT_CREDITS\" or \"TRYON_TIMEOUT\"." },
        message: { type: "string", maxLength: 2000, description: "The error message text, if any." },
        httpStatus: { type: "integer", description: "HTTP status code, e.g. 422." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler(args) {
      /** @type {import("./knowledge.js").ErrorInfo[]} */
      let matches = [];
      if (args.code) {
        const hit = findError(args.code);
        if (hit) matches = [hit];
      }
      if (!matches.length && args.message) {
        const inMessage = String(args.message).toUpperCase().match(/\b[A-Z]+(?:_[A-Z]+)+\b/g) ?? [];
        for (const candidate of inMessage) {
          const hit = findError(candidate);
          if (hit) {
            matches = [hit];
            break;
          }
        }
      }
      if (!matches.length && typeof args.httpStatus === "number") matches = errorsForStatus(args.httpStatus);

      if (!matches.length) {
        if (!args.code && !args.message && args.httpStatus === undefined) {
          return errorResult("Pass at least one of `code`, `message` or `httpStatus`. Call clothsy_docs with topic \"errors\" for the full list.");
        }
        const hints = [];
        if (typeof args.httpStatus === "number" && args.httpStatus >= 500) hints.push("5xx: retry with the same Idempotency-Key after a short backoff.");
        if (args.httpStatus === 400) hints.push("400: check headers (Idempotency-Key) and image inputs.");
        return textResult(
          [
            `No known Clothsy error matches ${[args.code && `code "${args.code}"`, args.httpStatus !== undefined && `status ${args.httpStatus}`].filter(Boolean).join(" / ") || "that message"}.`,
            ...hints,
            "If it came from your own route (not the Clothsy API), check your server logs. The full list of codes is in clothsy_docs topic \"errors\".",
          ].join("\n"),
        );
      }

      const sections = matches.map((e) =>
        [
          `## ${e.code}${e.status >= 100 ? ` (HTTP ${e.status})` : ""}`,
          "",
          `**Meaning:** ${e.meaning}`,
          "",
          `**Likely cause:** ${e.cause}`,
          "",
          `**Fix:** ${e.fix}`,
          "",
          `**Retry:** ${e.retry === "yes" ? "Yes" : e.retry === "no" ? "No" : "Not unchanged"}. ${e.retryNote}`,
          "",
          `**SDK error class:** ${e.sdkClass}`,
        ].join("\n"),
      );
      const header = matches.length > 1 ? `HTTP ${args.httpStatus} can mean ${matches.length} different codes; check the \`code\` field of the JSON body.\n\n` : "";
      const footer = "\n\nShow shoppers a friendly message (the SDK's friendlyMessage(err)), never raw codes. Retry only 429/500/502/503 and timeouts, always with the same Idempotency-Key.";
      return textResult(header + sections.join("\n\n") + footer);
    },
  },

  {
    name: "clothsy_check_setup",
    title: "Check the Clothsy API key and credits",
    description:
      "Verify the Clothsy AI API key and show remaining credits. Reads CLOTHSY_API_KEY from THIS MCP server's own environment only (set in the MCP client config); it deliberately takes no key argument — never ask the user to paste a key into the chat. Validates the key format, then calls GET /account (15 s timeout). If the key is missing, explains how to add it to the client's MCP config. Never prints the key.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: true },
    async handler(_args, ctx) {
      const key = readKey(ctx.env);
      if (key.state === "missing") {
        return errorResult(
          `CLOTHSY_API_KEY isn't set in this MCP server's environment, so the key can't be checked.\n\nThis only matters for clothsy_check_setup and clothsy_test_tryon; everything else works without a key. The store itself needs the key in its own server env (e.g. .env.local), separately.\n\n${HOW_TO_SET_KEY}`,
        );
      }
      if (key.state === "malformed") {
        const shown = key.raw.startsWith(KEY_PREFIX) ? maskKey(key.raw) : "(doesn't start with clothsy_live_)";
        return errorResult(
          `CLOTHSY_API_KEY is set but doesn't look like a Clothsy key: ${shown}, ${key.raw.length} characters.\n\nExpected format: clothsy_live_ followed by 43 letters, digits, "_" or "-" (56 characters in total). Common causes: a placeholder such as "clothsy_live_..." left in the config, a truncated copy, extra spaces or line breaks, or a different secret pasted by mistake. Copy the key again from ${PLATFORM_URL} -> Developer API (if you no longer have it, create a new key; this replaces the old one).\n\nNo request was sent.\n\n${HOW_TO_SET_KEY}`,
        );
      }

      const baseUrl = baseUrlFrom(ctx.env);
      const res = await apiRequest({ baseUrl, key: key.key, method: "GET", path: "/account", timeoutMs: 15_000, signal: ctx.signal });
      if (!res.ok) {
        const extra =
          res.code === "INVALID_API_KEY"
            ? `\n\nThe key ${maskKey(key.key)} was refused. Each account has one active key, so it may have been replaced. Create or copy the current key at ${PLATFORM_URL} -> Developer API and update the MCP config (and the store's server env).`
            : "";
        return errorResult(`Key format OK (${maskKey(key.key)}), but GET /account failed.\n\n${describeApiFailure(res)}${extra}`);
      }
      const credits = typeof res.body?.credits === "number" ? res.body.credits : null;
      const lines = [
        `Clothsy AI key is valid (${maskKey(key.key)}).`,
        credits === null ? "Credits: unknown (unexpected response shape)." : `Credits remaining: ${credits}.`,
      ];
      if (credits === 0) lines.push("", "The account has no credits: try-ons will fail with 402 INSUFFICIENT_CREDITS until it's topped up (email contact@fabricvton.com).");
      if (baseUrl !== API_BASE_URL) lines.push("", `Note: using a custom API base URL from CLOTHSY_BASE_URL: ${baseUrl}`);
      lines.push(
        "",
        "Remember: this is the key in the MCP server's environment. The store's server needs CLOTHSY_API_KEY in its own env (e.g. .env.local / hosting secrets), never in client code.",
      );
      return textResult(lines.join("\n"));
    },
  },

  {
    name: "clothsy_test_tryon",
    title: "Run one live test try-on (spends 1 credit)",
    description:
      "Run a single real try-on against the Clothsy AI API to prove the key and images work end to end. COSTS 1 CREDIT when it succeeds (failures are refunded), so only call it with confirmSpend: true after the user has explicitly agreed; without it the tool does nothing. Uses CLOTHSY_API_KEY from this MCP server's environment. Both images must be public HTTPS JPEG/PNG URLs (≤4 MB, answering 200 without redirects); the person photo must be of a consenting adult (e.g. the user themself). Waits up to ~3 minutes and returns status, resultUrl (valid 24 h), message and elapsed time.",
    inputSchema: {
      type: "object",
      properties: {
        personImageUrl: { type: "string", maxLength: 2048, description: "Public HTTPS URL of a photo of one consenting adult." },
        garmentImageUrl: { type: "string", maxLength: 2048, description: "Public HTTPS URL of the garment image (a product photo)." },
        title: { type: "string", maxLength: 120, description: "Optional garment title, e.g. \"Cropped denim jacket\". Improves results." },
        confirmSpend: {
          type: "boolean",
          description: "Must be true, set only after the user explicitly agreed to spend 1 credit on this test.",
        },
      },
      required: ["personImageUrl", "garmentImageUrl", "confirmSpend"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async handler(args, ctx) {
      if (args.confirmSpend !== true) {
        return errorResult(
          "Not run. A test try-on spends 1 credit from the user's Clothsy AI account when it succeeds (failed try-ons are refunded). Ask the user whether they want to spend it, then call again with confirmSpend: true. The person photo must be of a consenting adult, such as the user themself.\n\nTo check the key and credits for free, use clothsy_check_setup.",
        );
      }

      /** @type {string[]} */
      const problems = [];
      for (const [field, value] of [["personImageUrl", args.personImageUrl], ["garmentImageUrl", args.garmentImageUrl]]) {
        let url;
        try {
          url = new URL(value);
        } catch {
          problems.push(`${field} isn't a valid URL.`);
          continue;
        }
        if (url.protocol !== "https:") problems.push(`${field} must use https:// (got ${url.protocol}).`);
        if (url.port && url.port !== "443") problems.push(`${field} must use the default HTTPS port (got :${url.port}).`);
        if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[::1\])/.test(url.hostname) || url.hostname.endsWith(".local")) {
          problems.push(`${field} points at a private/local address, which the API can't reach. Use a public URL.`);
        }
      }
      if (problems.length) return errorResult(`No request sent, no credit used:\n${problems.map((p) => `- ${p}`).join("\n")}`);

      const key = readKey(ctx.env);
      if (key.state !== "ok") {
        return errorResult(
          key.state === "missing"
            ? `CLOTHSY_API_KEY isn't set in this MCP server's environment, so a test try-on can't run. No credit used.\n\n${HOW_TO_SET_KEY}`
            : `CLOTHSY_API_KEY is set but isn't a valid Clothsy key format (run clothsy_check_setup for details). No credit used.`,
        );
      }

      const baseUrl = baseUrlFrom(ctx.env);
      const idempotencyKey = newIdempotencyKey();
      /** @type {Record<string, unknown>} */
      const body = { personImageUrl: args.personImageUrl, garmentImageUrl: args.garmentImageUrl, consent: true };
      if (args.title) body.title = args.title;
      const started = Date.now();
      const elapsed = () => ((Date.now() - started) / 1000).toFixed(1);

      // Start (and usually finish) with /tryons/sync. Retry transient failures with the SAME key.
      /** @type {import("./api.js").ApiResponse | undefined} */
      let res;
      for (let attempt = 0; attempt < 3; attempt++) {
        res = await apiRequest({
          baseUrl,
          key: key.key,
          method: "POST",
          path: "/tryons/sync",
          json: body,
          headers: { "Idempotency-Key": idempotencyKey },
          timeoutMs: 90_000,
          signal: ctx.signal,
        });
        const transient = !res.ok && (res.code === "TIMEOUT" || res.code === "CONNECTION_ERROR" || [429, 500, 502, 503].includes(res.status));
        if (!transient || attempt === 2 || ctx.signal.aborted) break;
        const wait = !res.ok && res.retryAfter !== undefined ? Math.min(res.retryAfter, 30) * 1000 : 2000 * 2 ** attempt;
        try {
          await sleep(wait, ctx.signal);
        } catch {
          break;
        }
      }
      if (!res || !res.ok) {
        return errorResult(
          `Test try-on couldn't start after ${elapsed()} s.\n\n${res && !res.ok ? describeApiFailure(res) : "Unknown error."}\n\nNo credit is charged for a try-on that didn't finish.`,
        );
      }

      let tryon = res.body ?? {};
      const id = typeof tryon.id === "string" ? tryon.id : null;
      if (res.status === 202 || tryon.status === "pending") {
        if (!id) return errorResult(`The API accepted the try-on but returned no id (after ${elapsed()} s). Unexpected response.`);
        const deadline = Date.now() + 180_000;
        while (tryon.status === "pending" && Date.now() < deadline) {
          try {
            await sleep(2500, ctx.signal);
          } catch {
            return errorResult(`Cancelled while waiting. Try-on ${id} may still finish; check it with GET ${API_BASE_URL}/tryons/${id}.`);
          }
          const poll = await apiRequest({ baseUrl, key: key.key, method: "GET", path: `/tryons/${encodeURIComponent(id)}`, timeoutMs: 15_000, signal: ctx.signal });
          if (poll.ok) tryon = poll.body ?? tryon;
          else if (poll.status !== 429 && poll.status < 500 && poll.status !== 0) {
            return errorResult(`Polling try-on ${id} failed after ${elapsed()} s.\n\n${describeApiFailure(poll)}`);
          }
        }
        if (tryon.status === "pending") {
          return errorResult(`Try-on ${id} is still pending after ${elapsed()} s. It may still finish: poll GET ${API_BASE_URL}/tryons/${id} with the same key. Credits are only charged if it succeeds.`);
        }
      }

      const lines = [
        `Status: ${tryon.status}`,
        `Try-on id: ${tryon.id ?? id ?? "unknown"}`,
        `Elapsed: ${elapsed()} s`,
      ];
      if (tryon.status === "success") {
        lines.push(
          `resultUrl: ${tryon.resultUrl}`,
          "",
          "The result URL is public and valid for 24 hours. 1 credit was used. Wherever the store shows results, caption them as AI-generated.",
        );
      } else {
        lines.push(
          `message: ${tryon.message ?? "(none)"}`,
          "",
          "The try-on failed and the credit was refunded. Usually the person photo needs to show exactly one adult clearly (no other faces, including printed on clothing), or the garment image isn't suitable. See clothsy_explain_error.",
        );
      }
      lines.push("", "Reminder: only use photos of adults who agreed to their photo being processed.");
      const text = lines.join("\n");
      return tryon.status === "success" ? textResult(text) : errorResult(text);
    },
  },
];

/** @type {import("./protocol.js").Resource[]} */
export const RESOURCES = TOPICS.map((topic) => ({
  uri: `clothsy://docs/${topic}`,
  name: `clothsy-docs-${topic}`,
  title: `Clothsy AI docs: ${TOPIC_TITLES[topic]}`,
  description: `${TOPIC_TITLES[topic]} (same content as clothsy_docs topic "${topic}").`,
  mimeType: "text/markdown",
  read: () => docsFor(topic),
}));

/** @type {import("./protocol.js").Prompt[]} */
export const PROMPTS = [
  {
    name: "add_clothsy_tryon",
    title: "Add Clothsy AI try-on to this store",
    description: "Walk the agent through adding Clothsy AI virtual try-on to the current project, end to end.",
    arguments: [
      {
        name: "stack",
        description: "Optional: nextjs, node, python or http. Leave empty to detect it from the project.",
        required: false,
      },
    ],
    get(args) {
      const stack = typeof args.stack === "string" ? args.stack.trim().toLowerCase() : "";
      const known = ["nextjs", "node", "python", "http"].includes(stack);
      const first = known
        ? `1. The stack is "${stack}". Still skim the project (package.json or equivalent) to confirm, then call clothsy_integration_plan with { "stack": "${stack}" } and a productLookup describing how this codebase loads products.`
        : `1. Detect the stack: read the project's package.json (or requirements.txt, pyproject.toml, composer.json, Gemfile...) and call clothsy_detect_stack with its contents and a one-line description. If it recommends the Shopify app or WooCommerce plugin, stop and tell me how to install it instead of writing code.
2. Call clothsy_integration_plan with the recommended stack and a productLookup describing how this codebase loads products.`;
      const n = known ? 2 : 3;
      const text = `Add Clothsy AI virtual try-on to this store using the clothsy MCP tools.

${first}
${n}. Implement the plan in this codebase: create/modify every file it lists, adapting paths, imports, styling and the product lookup to the existing code. Put the button on the product page next to add-to-cart.
${n + 1}. Keep the API key server-side: read it from CLOTHSY_API_KEY on the server only, add it to the git-ignored env file (e.g. .env.local) as a placeholder for me to fill in, and never put it in client code, a NEXT_PUBLIC_/VITE_ variable, or a committed file. Don't ask me to paste the key into the chat.
${n + 2}. Garment images must come from the store's catalogue on the server, never from the browser. Keep the consent checkbox and show results with an "AI-generated" caption.
${n + 3}. Run the project's type-check/lint/build to make sure it compiles.
${n + 4}. Run clothsy_check_setup to verify the key configured for the MCP server and the remaining credits, and tell me if anything needs fixing. Don't run clothsy_test_tryon unless I explicitly agree to spend a credit.
${n + 5}. Finish with a short summary: files changed, the env var I need to set (locally and on my host), and the verification checklist from the plan.

If anything fails, use clothsy_explain_error and clothsy_docs (topics: ${TOPICS.join(", ")}). Docs: ${DOCS_URL}`;
      return {
        description: "Add Clothsy AI virtual try-on to this store",
        messages: [{ role: "user", content: { type: "text", text } }],
      };
    },
  },
];
