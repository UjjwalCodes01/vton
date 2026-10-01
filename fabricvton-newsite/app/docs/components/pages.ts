import type { HttpMethod } from "./Reference";

export type DocPage = { group: string; href: string; label: string; method?: HttpMethod };

/** Every docs page, in reading order. Drives the sidebar, the pager and the sitemap. */
export const DOC_PAGES: readonly DocPage[] = [
  { group: "Get started", href: "/docs/api", label: "Introduction" },
  { group: "Get started", href: "/docs/api/quickstart", label: "Quickstart" },
  { group: "Get started", href: "/docs/api/sdk", label: "TypeScript SDK" },
  { group: "Get started", href: "/docs/api/nextjs", label: "Next.js" },
  { group: "Get started", href: "/docs/api/mcp", label: "MCP server" },
  { group: "Guides", href: "/docs/api/custom-store", label: "Add try-on to a custom store" },
  { group: "Guides", href: "/docs/api/examples", label: "Full examples" },
  { group: "Guides", href: "/docs/api/images", label: "Uploading images" },
  { group: "Guides", href: "/docs/api/ai-label", label: "AI content label" },
  { group: "Guides", href: "/docs/api/errors", label: "Errors & limits" },
  { group: "Endpoints", href: "/docs/api/endpoints/upload-image", label: "Upload image", method: "POST" },
  { group: "Endpoints", href: "/docs/api/endpoints/create-try-on", label: "Create try-on", method: "POST" },
  { group: "Endpoints", href: "/docs/api/endpoints/create-try-on-sync", label: "Create try-on (sync)", method: "POST" },
  { group: "Endpoints", href: "/docs/api/endpoints/get-try-on", label: "Get try-on", method: "GET" },
  { group: "Endpoints", href: "/docs/api/endpoints/account", label: "Account", method: "GET" },
];
