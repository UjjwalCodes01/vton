# CONTENT_TODO

Every placeholder on the FabricVTON homepage (`fabricvton-nextjs/src/app/(company)`). Placeholders are written as `[TOKEN]` and render as visible, clearly marked text or a hatched panel — never as a broken image or link.

Nothing on the site may be an invented claim. These slots stay as placeholders until someone supplies the real thing.

---

## 1. Contact and company details

| Token | Where it appears | What it needs |
|---|---|---|
| `[CONTACT_EMAIL]` | Collaborate section (shown large), Footer → Connect | One public address for research, licensing and jobs. Once set, it becomes a real `mailto:` link and is added to the Organization structured data. |
| `[COMPANY_ADDRESS]` | Footer bottom row | Registered address, one line. |
| `[COMPANY_PROBLEM_STATEMENT]` | Collaborate section, under "Work with us." | One or two sentences on the hard problem FabricVTON started with. Concrete, no marketing language. |

**File:** `_lib/site.ts` (`CONTACT_EMAIL`, `COMPANY_ADDRESS`), `_lib/content.ts` (`COMPANY_PROBLEM_STATEMENT`).

## 2. Social and research profiles

| Token | Where | What it needs |
|---|---|---|
| `[COMPANY_LINKEDIN_URL]` | Footer → Connect | Company LinkedIn page URL. |
| `[COMPANY_GITHUB_URL]` | Footer → Connect | GitHub organisation URL. |
| `[COMPANY_SCHOLAR_URL]` | Footer → Connect | Google Scholar profile URL. |

Placeholders render as plain monospace text, not links. Real URLs also populate `sameAs` in the Organization JSON-LD.

**File:** `_lib/site.ts` (`SOCIALS`).

## 3. Team (5 slots)

Five founder slots, each with four tokens. Delete unused slots; the grid reflows.

| Token pattern | What it needs |
|---|---|
| `[FOUNDER_n_NAME]` | Full name. Initials for the avatar are derived from it; until then the slot shows `01`–`05`. |
| `[FOUNDER_n_ROLE]` | Short role, e.g. "Research lead". |
| `[FOUNDER_n_BACKGROUND]` | One line of real background. No superlatives. |
| `[FOUNDER_n_LINKEDIN]` | Profile URL. Renders as plain text until set. |

Photos are optional; the design uses initials in a neutral circle.

**File:** `_lib/content.ts` (`TEAM`).

## 4. Research images (5)

Each research card has its own image slot. They currently render as hatched placeholder panels naming the token. Do **not** reuse one image across cards.

| Token | Card |
|---|---|
| `[RESEARCH_IMAGE_VISUAL_UNDERSTANDING]` | 01 Visual Understanding |
| `[RESEARCH_IMAGE_GENERATIVE_VISION]` | 02 Generative Vision |
| `[RESEARCH_IMAGE_MATERIAL_INTELLIGENCE]` | 03 Material Intelligence |
| `[RESEARCH_IMAGE_HUMAN_OBJECT_INTERACTION]` | 04 Human–Object Interaction |
| `[RESEARCH_IMAGE_EFFICIENT_VISUAL_AI]` | 05 Efficient Visual AI |

Suggested: a real output or diagnostic from that line of work (segmentation, mesh, texture crop, pose overlay). Landscape, at least 1200px wide, in `public/brand/research/`.

To wire one up, set `src`, `width`, `height` and `alt` on that field's `image` in `_lib/content.ts`. The placeholder disappears automatically.

## 5. Evidence (the before/after slider)

| Token | What it needs |
|---|---|
| `[EVIDENCE_BEFORE]` | The original photograph. Portrait, 3:4, at least 900px wide. |
| `[EVIDENCE_AFTER]` | Our generated result for the **same person and pose**, identical framing, so the slider lines up. |
| `[EVIDENCE_CAPTION]` | One factual line: what the input was, what the model produced, and anything a reader should know. No metrics unless they are measured. |

This is the single most valuable thing to supply: it is the only place the site shows what the technology actually does.

**File:** `_lib/content.ts` (`EVIDENCE`).

## 6. Open Graph image

| Token | What it needs |
|---|---|
| `[OG_IMAGE]` | A 1200×630 social sharing image. Currently `/brand/og.png`, generated from the logo lockup on the page background — functional, but not designed for sharing. |

**File:** `(company)/page.tsx` (`metadata.openGraph.images`).

---

## Not a placeholder, but needs a decision

- **`CLOTHSY_URL`** (`_lib/site.ts`) points at `https://clothsyai.fabricvton.com`. Nothing in the repo shows that host is live yet. Until it is, every "Visit Clothsy AI" link dead-ends. The Clothsy landing page still served from this domain is `/clothsy` (`CLOTHSY_LEGACY_PATH`).
- **Clothsy demo image rights.** The product section uses `public/brand/clothsy/{person,garment-flat,result}.webp`, derived from `public/demo_tryon/product_1`. These are third-party retail photographs and the garment carries a visible brand label. Confirm the rights or replace them.
- **`SHOW_JOURNAL`** (`_lib/site.ts`) is `false`. The Journal section and its component stay in the codebase but are not rendered until a real post exists. Add posts to `JOURNAL_POSTS` with `status: "published"` and a real `publishedAt`, then flip the flag.
- **Open roles.** The Collaborate section says we are interested in hearing from people, with no invented job listings. Add a real careers page or list when roles exist.
