# Genlook Mirror (Next.js + TypeScript)

This project runs the scraped Genlook website through a Next.js App Router server while preserving the original HTML output.

## What Is Implemented

- Extensionless URLs are supported (example: /about -> about.html).
- Nested locale and blog paths are supported (example: /ar/blog/taqniyat-qiyas-iftiradi-ai).
- Mirrored static assets under /_next/static and other file paths are served from the scraped data.
- The source mirror is read directly from:
	- ../genlook-clone/genlook.app

## Route Handler

The main file serving logic is in:

- src/app/[[...slug]]/route.ts

It resolves incoming paths to mirrored files in this order:

1. exact file path if extension exists
2. path + .html
3. path + /index.html

## Run

Development:

```bash
npm run dev:mirror
```

Production:

```bash
npm run build
npm run start:mirror
```

Default mirror port in helper scripts: 3100
