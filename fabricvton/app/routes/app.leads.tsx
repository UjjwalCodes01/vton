import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { useDownload } from "../download";
import { formatDateTime } from "../format";

const PER_PAGE = 50;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  // A non-numeric ?page= would otherwise reach Prisma as NaN and 500.
  const page = Math.max(1, Math.floor(Number(url.searchParams.get("page"))) || 1);
  const query = (url.searchParams.get("query") || "").trim().slice(0, 200);

  // Case-insensitive: Postgres `contains` is case-sensitive by default, so a
  // search for "john@" would miss "John@".
  const where = query
    ? { shop, email: { contains: query, mode: "insensitive" as const } }
    : { shop };

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: { id: true, email: true, productTitle: true, createdAt: true },
    }),
    db.lead.count({ where }),
  ]);

  return {
    leads: leads.map((lead) => ({ ...lead, createdAt: lead.createdAt.toISOString() })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PER_PAGE)),
    query,
  };
};

export default function Leads() {
  const { leads, total, page, totalPages, query } = useLoaderData<typeof loader>();
  const { download, pending } = useDownload();

  const pageHref = (target: number) => {
    const params = new URLSearchParams({ page: String(target) });
    if (query) params.set("query", query);
    return `?${params.toString()}`;
  };

  return (
    <s-page heading="Leads">
      <s-button
        slot="secondary-actions"
        icon="export"
        loading={pending !== null}
        disabled={total === 0 && !query}
        onClick={() => download("/app/leads/export", "clothsy-ai-leads.csv")}
      >
        Export CSV
      </s-button>

      <s-section padding="none">
        <s-table>
          <Form slot="filters" method="get">
            <s-stack direction="inline" gap="small-200" alignItems="center">
              <s-search-field
                name="query"
                label="Search leads"
                labelAccessibilityVisibility="exclusive"
                placeholder="Search by email"
                defaultValue={query}
              />
              <s-button type="submit">Search</s-button>
              {query && <s-link href="?">Clear</s-link>}
            </s-stack>
          </Form>

          <s-table-header-row>
            <s-table-header listSlot="primary">Email</s-table-header>
            <s-table-header>Product</s-table-header>
            <s-table-header>Captured</s-table-header>
          </s-table-header-row>
          <s-table-body>
            {leads.map((lead) => (
              <s-table-row key={lead.id}>
                <s-table-cell>{lead.email}</s-table-cell>
                <s-table-cell>{lead.productTitle ?? "—"}</s-table-cell>
                <s-table-cell>{formatDateTime(lead.createdAt)}</s-table-cell>
              </s-table-row>
            ))}
          </s-table-body>
        </s-table>

        {leads.length === 0 && (
          <s-box padding="base">
            <s-stack gap="small-200">
              <s-heading>{query ? "No matching leads" : "No leads yet"}</s-heading>
              <s-paragraph>
                {query
                  ? `No captured email contains "${query}".`
                  : "When shoppers enter their email in the try-on, they'll appear here."}
              </s-paragraph>
            </s-stack>
          </s-box>
        )}

        {totalPages > 1 && (
          <s-box padding="base">
            <s-stack direction="inline" justifyContent="space-between" alignItems="center">
              <s-button
                icon="chevron-left"
                accessibilityLabel="Previous page"
                href={pageHref(page - 1)}
                disabled={page <= 1}
              />
              <s-text color="subdued">
                Page {page} of {totalPages} · {total.toLocaleString("en-US")} leads
              </s-text>
              <s-button
                icon="chevron-right"
                accessibilityLabel="Next page"
                href={pageHref(page + 1)}
                disabled={page >= totalPages}
              />
            </s-stack>
          </s-box>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
