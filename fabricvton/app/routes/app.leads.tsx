import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useSubmit, Form } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const query = url.searchParams.get("query") || "";
  const perPage = 50;

  const where = query ? { shop, email: { contains: query } } : { shop };

  const leads = await db.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * perPage,
    take: perPage,
  });

  const total = await db.lead.count({ where });

  return { leads, total, page, perPage, query };
};

// Action: export leads as CSV by returning CSV data
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const allLeads = await db.lead.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });

  const csvRows = [
    "Email,Product,Date",
    ...allLeads.map((lead) =>
      `"${lead.email}","${lead.productTitle ?? ""}","${lead.createdAt.toISOString()}"`
    ),
  ];

  const csv = csvRows.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="fabricvton-leads.csv"',
    },
  });
};

export default function Leads() {
  const { leads, total, page, perPage, query } = useLoaderData<typeof loader>();
  const totalPages = Math.ceil(total / perPage);
  const submit = useSubmit();

  return (
    <s-page heading="Leads">
      <s-section heading="Captured Emails">
        <s-card>
          <div style={{ padding: "20px" }}>
            <div className="fv-flex fv-justify-between fv-items-center fv-mb-md fv-flex-wrap" style={{ gap: "16px" }}>
              <div className="fv-flex fv-items-center fv-gap-md">
                <Form method="get" onChange={(e) => submit(e.currentTarget)}>
                   <input
                     name="query"
                     type="search"
                     defaultValue={query}
                     placeholder="Search by email..."
                     className="fv-input"
                     style={{ width: "240px" }}
                   />
                </Form>
                {query && <span className="fv-text-sm fv-text-subdued">Found {total} results</span>}
              </div>

              {/* Export Button */}
              <form method="post" target="_blank">
                <s-button type="submit" variant="secondary">
                  ⬇ Export All Leads (CSV)
                </s-button>
              </form>
            </div>

            {/* Leads Table */}
            {leads.length === 0 ? (
              <div className="fv-empty-state">
                <div className="icon">📧</div>
                <h3>No leads found</h3>
                <p>
                  {query 
                     ? "No leads matched your search criteria." 
                     : "Once customers enter their email in the Try-On widget, their data will appear here."}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="fv-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Product</th>
                      <th>Captured Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id}>
                        <td>
                          <strong>{lead.email}</strong>
                        </td>
                        <td>{lead.productTitle ?? "—"}</td>
                        <td>
                          {new Date(lead.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="fv-pagination fv-mt-md">
                {page > 1 && (
                  <s-button
                    onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set("page", String(page - 1));
                        window.location.assign(url.toString());
                    }}
                  >
                    ← Previous
                  </s-button>
                )}
                <span className="page-info">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <s-button
                    onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set("page", String(page + 1));
                        window.location.assign(url.toString());
                    }}
                  >
                    Next →
                  </s-button>
                )}
              </div>
            )}
          </div>
        </s-card>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
