import { readFileSync } from "node:fs";
import { API_BASE_URL, PLATFORM_URL } from "./knowledge.js";

/** @typedef {"nextjs" | "node" | "python" | "http"} Stack */
/** @typedef {{ path: string, action: "create" | "modify" | "append", lang: string, about: string, code: string }} PlanFile */

/**
 * @param {string} name path under src/templates
 * @param {string} lookupNote
 */
function template(name, lookupNote) {
  const raw = readFileSync(new URL(`./templates/${name}.tpl`, import.meta.url), "utf8");
  return raw.replaceAll("{{API_BASE_URL}}", API_BASE_URL).replaceAll("{{PRODUCT_LOOKUP_NOTE}}", lookupNote).trimEnd();
}

/**
 * Keep free text safe to embed in a code comment on one line.
 * @param {string | undefined} text
 */
function lookupNoteFrom(text) {
  const clean = (text ?? "").replace(/\*\//g, "* /").replace(/"""/g, "'''").replace(/\s+/g, " ").trim().slice(0, 300);
  return clean ? `The store's products come from: ${clean}` : "Wire this to wherever the store's products live.";
}

/** @param {PlanFile} file */
function renderFile(file) {
  return [`### \`${file.path}\` (${file.action})`, "", file.about, "", `\`\`\`${file.lang}`, file.code, "```"].join("\n");
}

const KEY_STEP = `Get an API key: sign in at ${PLATFORM_URL} -> **Developer API** -> create key (the first key adds 20 free credits). Ask the user to paste it into the env file themselves; don't put it in chat logs, source files or commits.`;

/**
 * Build an integration plan as markdown.
 * @param {Stack} stack
 * @param {string} [productLookup]
 */
export function integrationPlan(stack, productLookup) {
  const note = lookupNoteFrom(productLookup);
  const lookupStep = productLookup?.trim()
    ? `Replace the placeholder \`findProduct\` with a real lookup. The user said products come from: "${productLookup.trim().slice(0, 300)}". Return the product's public HTTPS JPEG/PNG image URL and title, or null. Do this on the server; never accept a garment image URL from the browser.`
    : "Replace the placeholder `findProduct` with the store's real product lookup (inspect the codebase to find how product pages load products). Return the product's public HTTPS JPEG/PNG image URL and title, or null. Do this on the server; never accept a garment image URL from the browser.";

  switch (stack) {
    case "nextjs":
      return render({
        title: "Next.js App Router",
        summary: "One route file (clothsy-ai/next), one client component (clothsy-ai/react TryOnButton) and one env var. Needs Next.js 14+ and React 18+.",
        steps: [
          "Install the SDK: `npm install clothsy-ai` (or the project's package manager: `pnpm add clothsy-ai`, `yarn add clothsy-ai`, `bun add clothsy-ai`).",
          KEY_STEP,
          "Add `CLOTHSY_API_KEY` to `.env.local` and check `.env.local` is git-ignored. Never use a `NEXT_PUBLIC_` prefix.",
          "Create `app/api/tryon/route.ts` (if the project uses `src/`, create `src/app/api/tryon/route.ts`).",
          lookupStep,
          "Create `components/ProductTryOn.tsx` and render it on the product page next to add-to-cart.",
          "Optional: theme it with the `--clothsy-*` CSS variables.",
          "Deploy: add `CLOTHSY_API_KEY` to the host's environment variables (Vercel: Settings -> Environment Variables, Production + Preview), keep `export const maxDuration = 60` in the route, then redeploy.",
          "Run `clothsy_check_setup` (with the key in this MCP server's env) to confirm the key and credits.",
        ],
        files: [
          {
            path: "app/api/tryon/route.ts",
            action: "create",
            lang: "ts",
            about: "Server route: POST starts a try-on (multipart `photo`, `productId`, `consent`, `requestId` -> `{ id }`), GET `?id=` returns `{ status, resultUrl, message }`. Same-origin check built in; key read from `CLOTHSY_API_KEY`.",
            code: template("nextjs/route.ts", note),
          },
          {
            path: "components/ProductTryOn.tsx",
            action: "create",
            lang: "tsx",
            about: "Client component wrapping `TryOnButton` (photo picker, consent checkbox, 1600 px JPEG resize, polling) plus a visible AI-generated note. Adjust the privacy link to the store's policy.",
            code: template("nextjs/ProductTryOn.tsx", note),
          },
          {
            path: "app/products/[id]/page.tsx (the existing product page)",
            action: "modify",
            lang: "tsx",
            about: "Render the button with the product's own id (the same id `findProduct` understands).",
            code: template("nextjs/page-snippet.tsx", note),
          },
          {
            path: ".env.local",
            action: "append",
            lang: "bash",
            about: "Server-only secret. Make sure `.env.local` is in `.gitignore`.",
            code: "CLOTHSY_API_KEY=clothsy_live_...",
          },
          {
            path: "app/globals.css",
            action: "append",
            lang: "css",
            about: "Optional theming. Available variables: --clothsy-accent, --clothsy-accent-contrast, --clothsy-bg, --clothsy-text, --clothsy-muted, --clothsy-border, --clothsy-error, --clothsy-backdrop, --clothsy-font, --clothsy-radius, --clothsy-radius-lg.",
            code: template("nextjs/theme.css", note),
          },
        ],
        env: [
          "`CLOTHSY_API_KEY=clothsy_live_...` in `.env.local` for local dev; in the hosting provider's secret/env settings for production.",
          "`maxDuration = 60` (already in route.ts) lets the start request run up to 60 s on Vercel.",
          "Want a custom UI instead of the button? Use `useTryOn({ endpoint: \"/api/tryon\" })` from `clothsy-ai/react` (see `clothsy_docs` topic `nextjs`); you then draw the consent checkbox and AI caption yourself.",
        ],
        checks: [
          "`grep -r CLOTHSY_API_KEY` finds it only in server code and env files, never in client components or `NEXT_PUBLIC_` vars.",
          "`.env.local` is git-ignored (`git check-ignore .env.local` prints the path).",
          "`npx tsc --noEmit` and the dev server start without errors.",
          "`curl -i localhost:3000/api/tryon?id=does-not-exist` returns a JSON error (the route is wired up).",
          "On a product page, the button opens a dialog; the submit is disabled until the consent box is ticked.",
          "A real try-on with a photo of a consenting adult shows a result within ~30-40 s, with the AI-generated note visible.",
          "An unknown productId is refused (resolveProduct returns null) — garment images never come from the browser.",
          "`clothsy_check_setup` reports the key as valid with credits > 0.",
        ],
      });

    case "node":
      return render({
        title: "Node.js server (Express) + SDK",
        summary: "Two routes on your server using the clothsy-ai SDK, plus a small browser script. Shown with Express and multer; the SDK calls are the same in Fastify, Hono, Remix, SvelteKit, Nuxt, Astro or Workers.",
        steps: [
          "Install: `npm install clothsy-ai express multer` (skip express/multer if the project already has a server framework and a multipart parser).",
          KEY_STEP,
          "Add `CLOTHSY_API_KEY` to `.env` (git-ignored) and load it (Node 20.6+: `node --env-file=.env server.mjs`; otherwise the project's dotenv setup).",
          "Add the two routes from `server.mjs` to the existing server (or create it). Keep the key on the server.",
          lookupStep,
          "Add the HTML snippet to the product page template and serve `public/tryon.js`. Set `data-product-id` to the product's id.",
          "Link the store's privacy policy next to the consent checkbox.",
          "Run `clothsy_check_setup` to confirm the key and credits.",
        ],
        files: [
          {
            path: "server.mjs",
            action: "create",
            lang: "js",
            about: "POST /tryon (multer upload -> images.upload -> tryons.create with the browser's requestId as idempotency key) and GET /tryon/:id (tryons.retrieve). Errors are turned into shopper-safe text with friendlyMessage.",
            code: template("node/server.mjs", note),
          },
          {
            path: "product page template",
            action: "modify",
            lang: "html",
            about: "Button, dialog, photo input, consent checkbox and an AI-generated caption on the result.",
            code: template("browser/snippet.html", note),
          },
          {
            path: "public/tryon.js",
            action: "create",
            lang: "js",
            about: "Resizes the photo to a 1600 px JPEG (drops EXIF/GPS), requires consent, posts to /tryon with a fresh requestId, polls /tryon/:id every 2.5 s for up to 3 minutes.",
            code: template("browser/tryon.js", note),
          },
          { path: ".env", action: "append", lang: "bash", about: "Server-only secret; keep `.env` in `.gitignore`.", code: "CLOTHSY_API_KEY=clothsy_live_..." },
        ],
        env: [
          "`CLOTHSY_API_KEY` in `.env` locally and in the host's secret settings in production. `new Clothsy()` reads it from process.env.",
          "Cloudflare Workers / Deno Deploy: no process.env — use `new Clothsy({ apiKey: env.CLOTHSY_API_KEY })` and the platform's secret store.",
          "Allow request bodies of ~5 MB on the POST route (the browser already resizes photos well below this).",
        ],
        checks: [
          "The key appears only in server code/env, never in public/ or any bundled client code.",
          "`.env` is git-ignored.",
          "`curl -i localhost:3000/tryon/does-not-exist` returns JSON (the route is wired up).",
          "POST /tryon without `consent=true` returns 403; with an unknown productId returns 404.",
          "A real try-on with a photo of a consenting adult shows a result with the AI-generated caption.",
          "Double-clicking submit creates one try-on (same requestId -> same idempotency key).",
          "`clothsy_check_setup` reports the key as valid with credits > 0.",
        ],
      });

    case "python":
      return render({
        title: "Python (Flask) + HTTP API",
        summary: "Two Flask routes calling the HTTP API with requests (there's no Python SDK), plus the same small browser script. The handlers port directly to Django views or FastAPI routes.",
        steps: [
          "Install: `pip install flask requests` (or add them to requirements.txt / pyproject.toml).",
          KEY_STEP,
          "Set `CLOTHSY_API_KEY` in the server environment (a git-ignored `.env` loaded by the process manager, or the host's secret settings).",
          "Add the two routes from `app.py` (or port them to Django/FastAPI).",
          lookupStep,
          "Add the HTML snippet to the product template and serve `public/tryon.js`.",
          "Run `clothsy_check_setup` to confirm the key and credits.",
        ],
        files: [
          {
            path: "app.py",
            action: "create",
            lang: "python",
            about: "POST /tryon uploads the photo to /images, then starts /tryons with the browser's requestId as Idempotency-Key; GET /tryon/<id> proxies /tryons/{id}. Retries 429/5xx with the same key.",
            code: template("python/app.py", note),
          },
          {
            path: "templates/product.html (the product page)",
            action: "modify",
            lang: "html",
            about: "Button, dialog, photo input, consent checkbox and an AI-generated caption on the result.",
            code: template("browser/snippet.html", note),
          },
          {
            path: "public/tryon.js",
            action: "create",
            lang: "js",
            about: "Resizes to a 1600 px JPEG, requires consent, posts to /tryon, polls /tryon/<id> every 2.5 s.",
            code: template("browser/tryon.js", note),
          },
          { path: ".env", action: "append", lang: "bash", about: "Server-only secret; keep it out of git.", code: "CLOTHSY_API_KEY=clothsy_live_..." },
        ],
        env: [
          "`CLOTHSY_API_KEY` must be in the server process environment (`os.environ[\"CLOTHSY_API_KEY\"]`).",
          "Django: raise `DATA_UPLOAD_MAX_MEMORY_SIZE`/`FILE_UPLOAD_MAX_MEMORY_SIZE` to ~5 MB. FastAPI: `pip install python-multipart` for form uploads.",
          `API base: ${API_BASE_URL}`,
        ],
        checks: [
          "The key is read from the environment only and never rendered into templates or static files.",
          "`curl -i localhost:3000/tryon/does-not-exist` returns JSON.",
          "POST /tryon without `consent=true` returns 403; with an unknown productId returns 404.",
          "A real try-on with a photo of a consenting adult shows a result with the AI-generated caption.",
          "`clothsy_check_setup` reports the key as valid with credits > 0.",
        ],
      });

    case "http":
      return render({
        title: "Raw HTTP API",
        summary: "The three calls every integration makes, as curl. Port them to your server language: upload the photo, start the try-on with an Idempotency-Key, poll for the result. Then add the browser snippet so shoppers talk to YOUR server, never to the API.",
        steps: [
          KEY_STEP,
          "Run the curl walk-through below once from a terminal to see the flow (spends 1 credit on success).",
          "In your server language, implement POST /tryon (validate consent + requestId, look the product up server-side, POST /images, POST /tryons with `Idempotency-Key: <requestId>`, return `{ id }`) and GET /tryon/{id} (proxy GET /tryons/{id}, return `{ status, resultUrl, message }`).",
          lookupStep.replace("the placeholder `findProduct`", "the garment lookup"),
          "Retry 429/500/502/503/timeouts with the SAME Idempotency-Key (1 s, 2 s, 4 s; honour Retry-After). Don't retry other 4xx unchanged.",
          "Add the HTML snippet and browser script to the product page; caption results as AI-generated.",
          "Run `clothsy_check_setup` to confirm the key and credits.",
        ],
        files: [
          { path: "try-clothsy.sh", action: "create", lang: "bash", about: "Reference sequence (needs curl + jq and a person.jpg of a consenting adult).", code: template("http/curl.sh", note) },
          { path: "product page template", action: "modify", lang: "html", about: "Button, dialog, consent checkbox and AI caption.", code: template("browser/snippet.html", note) },
          { path: "public/tryon.js", action: "create", lang: "js", about: "Browser side: resize, consent, POST /tryon, poll /tryon/{id}.", code: template("browser/tryon.js", note) },
        ],
        env: [
          "`CLOTHSY_API_KEY` in the server's environment/secret store; send `Authorization: Bearer <key>` from the server only.",
          `Base URL: ${API_BASE_URL}`,
          "Server HTTP client timeouts: 60 s for normal calls, at least 70 s for POST /tryons/sync.",
        ],
        checks: [
          "`curl -H \"Authorization: Bearer $CLOTHSY_API_KEY\" " + API_BASE_URL + "/account` returns `{ \"credits\": N }`.",
          "The key never appears in HTML, JS served to browsers, or git.",
          "POST /tryon without consent is refused; unknown products are refused; garment URLs come from the server.",
          "Retries reuse the same Idempotency-Key.",
          "Results are shown with a visible AI-generated caption.",
          "`clothsy_check_setup` reports the key as valid with credits > 0.",
        ],
      });

    default:
      throw new Error(`Unknown stack: ${stack}`);
  }
}

/**
 * @param {{ title: string, summary: string, steps: string[], files: PlanFile[], env: string[], checks: string[] }} plan
 */
function render(plan) {
  return [
    `# Clothsy AI try-on integration plan: ${plan.title}`,
    "",
    plan.summary,
    "",
    "## Steps",
    "",
    ...plan.steps.map((step, i) => `${i + 1}. ${step}`),
    "",
    "## Files",
    "",
    plan.files.map(renderFile).join("\n\n"),
    "",
    "## Environment",
    "",
    ...plan.env.map((line) => `- ${line}`),
    "",
    "## Rules to keep",
    "",
    "- The API key stays on the server. The browser talks only to the store's own routes.",
    "- Garment images come from the store's catalogue on the server, never from the browser.",
    "- Only send `consent: true` after the shopper ticks the consent checkbox themselves; photos must be of an adult.",
    "- Show every result with a visible \"AI-generated\" caption and matching alt text.",
    "- One Idempotency-Key (requestId) per shopper action; reuse it on retries so nothing is charged twice.",
    "",
    "## Verification checklist",
    "",
    ...plan.checks.map((line) => `- [ ] ${line}`),
    "",
  ].join("\n");
}
