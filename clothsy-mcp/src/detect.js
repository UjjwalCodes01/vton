import { SHOPIFY_APP_URL, WOO_PLUGIN_URL } from "./knowledge.js";

/**
 * @typedef {"shopify-app" | "woocommerce-plugin" | "nextjs" | "node" | "python" | "http" | "unknown"} Path
 * @typedef {{ path: Path, stack: "nextjs" | "node" | "python" | "http" | null, confidence: "high" | "medium" | "low", reasons: string[], notes: string[] }} Detection
 */

/** Node.js server frameworks where "SDK + two routes" is the right fit. */
const NODE_SERVERS = [
  ["express", "Express"],
  ["fastify", "Fastify"],
  ["koa", "Koa"],
  ["hono", "Hono"],
  ["@nestjs/core", "NestJS"],
  ["@hapi/hapi", "hapi"],
  ["@remix-run/node", "Remix"],
  ["@remix-run/react", "Remix"],
  ["@react-router/node", "React Router (framework mode)"],
  ["@react-router/dev", "React Router (framework mode)"],
  ["@shopify/hydrogen", "Shopify Hydrogen"],
  ["nuxt", "Nuxt"],
  ["@sveltejs/kit", "SvelteKit"],
  ["astro", "Astro"],
  ["@solidjs/start", "SolidStart"],
  ["@builder.io/qwik-city", "Qwik City"],
  ["@medusajs/medusa", "Medusa"],
  ["@medusajs/framework", "Medusa"],
  ["@vendure/core", "Vendure"],
  ["@sveltejs/adapter-node", "SvelteKit"],
  ["wrangler", "Cloudflare Workers"],
  ["h3", "h3"],
  ["elysia", "Elysia"],
];

/** Browser-only toolchains: they need a server added. */
const SPA_ONLY = [
  ["vite", "Vite"],
  ["react-scripts", "Create React App"],
  ["@angular/core", "Angular"],
  ["vue", "Vue"],
  ["expo", "Expo"],
  ["react-native", "React Native"],
];

const TEXT_RULES = {
  shopifyTheme: /\bshopify\b(?![\s-]*(hydrogen|headless|storefront api))/,
  hydrogen: /\bhydrogen\b|\bshopify\b.*\b(headless|storefront api)\b|\bheadless\b.*\bshopify\b/,
  woo: /\bwoo ?commerce\b|\bwordpress\b|\bwp\b/,
  headless: /\bheadless\b|\bdecoupled\b|\bnext\.?js\b|\bnuxt\b|\bgatsby\b|\bfaust\b/,
  nextjs: /\bnext\.?js\b|\bnext app\b|\bapp router\b|\bpages router\b/,
  pagesRouter: /\bpages router\b|\bpages\/api\b|\bpages directory\b/,
  node: /\b(node(\.?js)?|express|fastify|koa|hono|nestjs|remix|react router|sveltekit|svelte ?kit|nuxt|astro|medusa|vendure|bun|deno|cloudflare workers?)\b/,
  python: /\b(python|django|flask|fastapi|saleor|wagtail|oscar)\b/,
  other: /\b(php|laravel|symfony|magento|prestashop|opencart|ruby on rails|rails|ruby|sinatra|spree|solidus|golang|go (?:backend|server|api|service)|java|spring boot|kotlin backend|asp\.net|\.net|c#|elixir|phoenix|rust|axum|actix)(?![\w])/,
  mobile: /\b(ios|android|swift|kotlin|flutter|react native|expo|mobile app)\b/,
};

/**
 * Recommend an integration path from a free-text description and/or package.json.
 * @param {{ projectDescription?: string, packageJson?: string }} input
 * @returns {{ detection: Detection, warnings: string[] }}
 */
export function detectStack(input) {
  const text = (input.projectDescription ?? "").toLowerCase();
  /** @type {string[]} */
  const warnings = [];
  /** @type {Record<string, string>} */
  let deps = {};
  let pkgName = "";

  if (input.packageJson && input.packageJson.trim()) {
    try {
      const pkg = JSON.parse(input.packageJson);
      pkgName = typeof pkg.name === "string" ? pkg.name : "";
      deps = { ...(pkg.devDependencies ?? {}), ...(pkg.dependencies ?? {}) };
    } catch {
      warnings.push("`packageJson` isn't valid JSON, so it was ignored. Pass the file's exact contents.");
    }
  }
  const has = (/** @type {string} */ name) => Object.hasOwn(deps, name);
  const hasPrefix = (/** @type {string} */ prefix) => Object.keys(deps).some((d) => d.startsWith(prefix));

  /** @type {string[]} */
  const notes = [];

  // 1. Hosted platforms with a no-code install.
  const customFront =
    TEXT_RULES.headless.test(text) ||
    TEXT_RULES.node.test(text) ||
    /custom (storefront|front ?end)/.test(text) ||
    has("next") ||
    NODE_SERVERS.some(([dep]) => has(dep));
  const wooHeadless = TEXT_RULES.woo.test(text) && (customFront || hasPrefix("@woocommerce/"));
  const hydrogen = has("@shopify/hydrogen") || TEXT_RULES.hydrogen.test(text);
  const shopifyHeadless = TEXT_RULES.shopifyTheme.test(text) && !hydrogen && customFront;

  if (TEXT_RULES.shopifyTheme.test(text) && !hydrogen && !customFront) {
    return done({
      path: "shopify-app",
      stack: null,
      confidence: "high",
      reasons: [
        "The project is a Shopify store with an Online Store theme.",
        `The Clothsy AI Shopify app (${SHOPIFY_APP_URL}) adds the try-on button, consent screen and billing with no code, so there's nothing to build.`,
      ],
      notes: [
        "Install the app from the Shopify App Store and enable the try-on block in the theme editor.",
        "Only use the API/SDK if the storefront is headless (Hydrogen or a custom front end). Describe it that way and run this tool again.",
      ],
    });
  }
  if (TEXT_RULES.woo.test(text) && !wooHeadless) {
    return done({
      path: "woocommerce-plugin",
      stack: null,
      confidence: "high",
      reasons: [
        "The project is a WooCommerce / WordPress store.",
        `The Clothsy AI WordPress plugin (${WOO_PLUGIN_URL}) adds try-on to product pages with no code.`,
      ],
      notes: [
        "Install it from Plugins -> Add New in wp-admin (search \"Clothsy AI\").",
        "Only use the API/SDK if the front end is headless (e.g. Next.js reading WooCommerce data). Describe it that way and run this tool again.",
      ],
    });
  }
  if (hydrogen) {
    notes.push("Shopify Hydrogen storefronts don't run theme app extensions, so the Shopify app's button won't appear there. If the store also has an Online Store theme, the Shopify app covers that one with no code.");
  }
  if (shopifyHeadless) {
    notes.push("This is a headless Shopify setup, so the Shopify app's theme button won't reach the custom front end. Read garment images from the Storefront/Admin API on the server. If the store also has an Online Store theme, the Shopify app covers that one with no code.");
  }
  if (wooHeadless) {
    notes.push("This is a headless WooCommerce setup, so the WordPress plugin won't reach the custom front end. Read garment images from the WooCommerce REST/Store API on the server.");
  }

  // 2. Next.js.
  if (has("next") || (TEXT_RULES.nextjs.test(text) && Object.keys(deps).length === 0)) {
    const major = majorVersion(deps.next);
    /** @type {string[]} */
    const reasons = [];
    if (has("next")) reasons.push(`package.json depends on next${deps.next ? `@${deps.next}` : ""}.`);
    else reasons.push("The description mentions Next.js.");
    reasons.push(
      "clothsy-ai/next gives a ready-made App Router route (POST to start, GET to poll) that keeps the key on the server and resolves products server-side.",
      "clothsy-ai/react's TryOnButton adds the photo picker, consent checkbox, in-browser resize and polling in one component.",
    );
    if (major !== null && major < 14) {
      notes.push(`next@${deps.next} is older than 14, which clothsy-ai/next and clothsy-ai/react expect. Upgrade Next.js, or use the "node" plan and write the two routes yourself as pages/api handlers.`);
      return done({
        path: "node",
        stack: "node",
        confidence: "medium",
        reasons: [reasons[0], "The clothsy-ai SDK core works on any Node.js 18+ server, so two pages/api routes using it keep the key server-side until you upgrade."],
        notes,
      });
    }
    if (TEXT_RULES.pagesRouter.test(text) || (has("next") && !TEXT_RULES.nextjs.test(text))) {
      notes.push("If the project uses the Pages Router (a pages/ directory), that's fine: on Next.js 14+ you can add app/api/tryon/route.ts alongside pages/, and TryOnButton works on any page.");
    }
    if (!has("react") && has("next")) notes.push("react isn't listed in dependencies; clothsy-ai/react needs React 18+.");
    return done({ path: "nextjs", stack: "nextjs", confidence: has("next") ? "high" : "medium", reasons, notes });
  }

  // 3. Node.js servers and meta-frameworks.
  const nodeHit = NODE_SERVERS.find(([dep]) => has(dep));
  if (nodeHit || hydrogen || (TEXT_RULES.node.test(text) && !TEXT_RULES.python.test(text))) {
    const name = nodeHit ? nodeHit[1] : hydrogen ? "Shopify Hydrogen" : "a Node.js server";
    const reasons = [
      nodeHit ? `package.json depends on ${nodeHit[0]} (${nodeHit[1]}).` : `The description points to ${name}.`,
      "The clothsy-ai SDK runs on Node.js 18+, Deno, Bun, Edge and Workers, handles idempotency keys, retries and typed errors, and has zero dependencies.",
      "You add two server routes (POST /tryon to start, GET /tryon/:id to poll) plus a small browser script, so the key never reaches the browser.",
    ];
    if (nodeHit && nodeHit[0] !== "express") {
      notes.push(`The plan's sample server uses Express; port the two handlers to ${nodeHit[1]}'s server routes / API endpoints. The SDK calls are identical.`);
    }
    if (has("react")) notes.push("The project uses React, so you can also use clothsy-ai/react's TryOnButton or useTryOn against your POST/GET routes if they match the Next.js helper's contract (see the nextjs docs topic). Otherwise use the plain browser script.");
    if (has("wrangler") || /workers?/.test(text)) notes.push("On Cloudflare Workers there's no process.env: pass `new Clothsy({ apiKey: env.CLOTHSY_API_KEY })` and store the key with `wrangler secret put CLOTHSY_API_KEY`.");
    return done({ path: "node", stack: "node", confidence: nodeHit ? "high" : "medium", reasons, notes });
  }

  // 4. Python (checked before browser-only toolchains: a Vite front end often sits on another backend).
  if (TEXT_RULES.python.test(text)) {
    return done({
      path: "python",
      stack: "python",
      confidence: "high",
      reasons: [
        "The project is Python.",
        "There's no Python SDK yet; the HTTP API is small (upload, start, poll) and the plan wraps it with requests, retries and idempotency keys.",
      ],
      notes: /django|fastapi/.test(text)
        ? ["The plan's sample uses Flask; the two handlers map directly onto Django views or FastAPI routes."]
        : [],
    });
  }

  // 5. Any other server language.
  if (TEXT_RULES.other.test(text)) {
    const match = text.match(TEXT_RULES.other);
    return done({
      path: "http",
      stack: "http",
      confidence: "medium",
      reasons: [
        `The project uses ${match ? match[0] : "a non-JavaScript backend"}, which has no official SDK.`,
        "Call the HTTP API from the server: POST /images, POST /tryons with an Idempotency-Key, then poll GET /tryons/{id}.",
      ],
      notes: /magento|prestashop|opencart/.test(text)
        ? ["There's no ready-made plugin for this platform, so integrate through its module/extension system on the server side."]
        : [],
    });
  }

  // 6. Browser-only projects need a server first.
  const spaHit = SPA_ONLY.find(([dep]) => has(dep));
  if (spaHit || TEXT_RULES.mobile.test(text)) {
    const name = spaHit ? spaHit[1] : "a mobile or browser-only app";
    return done({
      path: "node",
      stack: "node",
      confidence: "medium",
      reasons: [
        `${name} runs entirely on the user's device, where an API key can't be kept secret.`,
        "Add a small server (or serverless function) that holds the key and exposes POST /tryon and GET /tryon/:id; the Node plan shows exactly that.",
      ],
      notes: [
        "Never put CLOTHSY_API_KEY in a VITE_, REACT_APP_, EXPO_PUBLIC_ or similar variable: those are bundled into the client.",
        "If the app already has a backend in another language, use that backend's plan instead (python or http).",
      ],
    });
  }

  if (pkgName || Object.keys(deps).length) {
    return done({
      path: "node",
      stack: "node",
      confidence: "low",
      reasons: [
        "The project has a package.json but no recognised web framework.",
        "If it has a Node.js server, the SDK + two routes plan fits.",
      ],
      notes: ["Tell me the framework (or paste more of package.json) for a more specific recommendation."],
    });
  }

  return done({
    path: "unknown",
    stack: null,
    confidence: "low",
    reasons: ["Not enough information to tell the stack."],
    notes: [
      "Pass `packageJson` (the project's package.json contents) and/or a `projectDescription` such as \"Next.js 15 App Router store with products in Postgres\" or \"Django shop\".",
      "If you can inspect the repo yourself: look for package.json (next, express, ...), requirements.txt / pyproject.toml (Django, Flask, FastAPI), composer.json (Laravel), Gemfile (Rails) or go.mod.",
    ],
  });

  /** @param {Detection} detection */
  function done(detection) {
    return { detection, warnings };
  }
}

/** @param {string | undefined} range */
function majorVersion(range) {
  if (!range) return null;
  const match = String(range).match(/(\d+)(?:\.\d+)*/);
  if (!match || /^(latest|canary|beta|rc|\*|workspace|file|link|git)/.test(String(range))) return null;
  return Number(match[1]);
}
