# fabricvton.com (Next.js, App Router)

Website for **FabricVTON**, the AI research and technology company. **Clothsy AI** is a product built by FabricVTON; its marketing pages live in the same app for now and are on their way to `clothsyai.fabricvton.com`.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

Optional env: `NEXT_PUBLIC_GA_ID` (Google Analytics, loaded by both layouts).

## Two route groups, two root layouts

There is deliberately no `src/app/layout.tsx`. Each group has its own root layout (its own `<html>`), so moving between them is a full page load and their CSS can never leak into each other.

| Group | Serves | What it is |
|---|---|---|
| `src/app/(company)` | `/` | The FabricVTON company homepage. Plain CSS (`company.css`, every class prefixed `fv-`), Geist via `next/font`, no animation library. |
| `src/app/(clothsy)` | `/clothsy`, `/about`, `/demo`, `/studio`, `/tgm`, `/privacy`, `/tos`, `/widget-privacy` | The previous site, unchanged apart from links. `/clothsy` is the old landing page (noindex). |

`/privacy`, `/tos` and `/widget-privacy` must keep working at these exact URLs: the WooCommerce plugin and the Shopify app link to them.

When Clothsy AI gets its own host, mount the `(clothsy)` group at that host's root and set `CLOTHSY_HOME` in `src/app/(clothsy)/lib/site.ts` to `"/"`.

## The company homepage

```
(company)/
  layout.tsx            fonts, metadata, Organization JSON-LD, motion boot script
  page.tsx              composes the sections
  company.css           tokens, type scale, every section, the motion contract
  _components/          Nav (client), Motion (client), Hero, Research, Approach, Product,
                        Journal, Company, Careers, FinalCta, Footer  (all others are server components)
  _lib/site.ts          URLs, contact address, social links  <- change these here
  _lib/content.ts       copy that changes: research fields, pipeline, journal posts, roles
  _motion/initMotion.ts the whole motion engine (~150 lines, no dependencies)
```

### Motion

Everything animated is driven by one small engine (`_motion/initMotion.ts`):

- `[data-reveal]` fades/raises elements in once (one `IntersectionObserver`).
- `[data-progress]` sections get a `--p` (0 to 1) custom property from a single rAF-throttled scroll listener. CSS derives every stage from it with `calc()` / `clamp()`, animating only `transform`, `opacity` and `clip-path`. Modes: `hero`, `pin` (the sticky "Approach" pipeline) and `through`.
- `[data-parallax]` (hero) and `[data-magnet]` (arrows) react to the pointer on fine pointers only.

`html.fv-motion` is added by an inline script only when the visitor has not asked for reduced motion. **Without that class (reduced motion, or no JS) every section renders its finished state**: nothing hidden, nothing pinned.

### Content rules

Nothing on the page may be an invented claim: no metrics, customers, testimonials, publications, dates or authors. Journal posts are typed drafts (`status: "draft"`) that render as non-linking cards without a date until a real post is marked `"published"`. Open roles are an empty list until real roles exist.

### Brand assets

`public/brand/` is generated from the supplied originals in `brand/fabricvton/` by `brand/fabricvton/prepare_assets.py` (Python standard library, macOS `sips` and `cwebp`). Nothing is redrawn: the fabric forms are cut out and split into two aligned layers, and the wordmarks are converted from white background to alpha. Re-run the script if the originals change:

```bash
python3 brand/fabricvton/prepare_assets.py
```

`public/brand/clothsy/` holds optimised copies of the existing Clothsy demo images (`public/demo_tryon/product_1`).
