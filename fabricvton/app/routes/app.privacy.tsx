import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { markDataRequestDelivered } from "../privacy.server";
import { RETENTION } from "../retention.server";
import { attachmentHeaders } from "../csv.server";

// The merchant-facing half of the customers/data_request workflow.
//
// Shopify sends the request to us, but the legal obligation to answer the shopper
// within 30 days is the merchant's. This page is how they discharge it: see the
// request, download what we hold, and record that they delivered it — which is
// the part that makes the workflow auditable rather than best-effort.

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const downloadId = url.searchParams.get("download");

  if (downloadId) {
    // Scoped by shop, so an id from another store's request resolves to nothing.
    const record = await db.privacyRequest.findFirst({
      where: { id: downloadId, shop },
    });

    if (!record?.exportJson) {
      throw new Response("Export not available", { status: 404 });
    }

    return new Response(record.exportJson, {
      headers: attachmentHeaders(
        `fabricvton-data-request-${record.id}.json`,
        "application/json; charset=utf-8"
      ),
    });
  }

  const requests = await db.privacyRequest.findMany({
    where: { shop },
    orderBy: { requestedAt: "desc" },
    take: 100,
  });

  return {
    requests: requests.map((record) => ({
      id: record.id,
      customerEmail: record.customerEmail,
      customerId: record.customerId,
      status: record.status,
      recordCount: record.recordCount,
      requestedAt: record.requestedAt.toISOString(),
      deliveredAt: record.deliveredAt?.toISOString() ?? null,
      deliveredTo: record.deliveredTo,
      note: record.note,
      hasExport: Boolean(record.exportJson),
      // Shopify's deadline is 30 days from receipt; surfacing the remaining days
      // is the difference between a list and something a merchant can act on.
      daysRemaining: Math.max(
        0,
        30 -
          Math.floor((Date.now() - record.requestedAt.getTime()) / (24 * 60 * 60 * 1000))
      ),
    })),
    retention: RETENTION,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const id = String(formData.get("id") || "");
  if (!id) {
    return { success: false, message: "Missing request id." };
  }

  const delivered = await markDataRequestDelivered({
    shop,
    id,
    deliveredTo: (formData.get("deliveredTo") as string | null)?.trim() || null,
    // This app installs with offline tokens, so there is usually no associated
    // user on the session; the shop domain is then the most specific actor we can
    // honestly record. Where an online token IS present, attribute the real user.
    deliveredBy:
      session.onlineAccessInfo?.associated_user?.email || session.shop,
    note: (formData.get("note") as string | null)?.trim() || null,
  });

  return delivered
    ? { success: true, message: "Marked as delivered." }
    : { success: false, message: "That request was already closed." };
};

function statusLabel(status: string) {
  if (status === "delivered") return "✅ Delivered";
  if (status === "no_data") return "➖ No data held";
  return "⏳ Awaiting delivery";
}

export default function Privacy() {
  const { requests, retention } = useLoaderData<typeof loader>();
  const open = requests.filter((record) => !record.deliveredAt && record.status !== "no_data");

  return (
    <s-page heading="Privacy requests">
      <s-section heading="Customer data requests">
        <s-card>
          <div style={{ padding: "20px" }}>
            <p className="fv-text-sm fv-text-subdued" style={{ marginBottom: "16px" }}>
              When a shopper asks your store for their data, Shopify notifies
              FabricVTON and we compile everything we hold for that email address.
              Download it, send it to the shopper, then mark it delivered here so
              you have a record of having answered. Shopify expects a response
              within 30 days of the request.
            </p>

            {open.length > 0 && (
              <s-banner tone="warning">
                {open.length} request{open.length === 1 ? "" : "s"} awaiting delivery.
              </s-banner>
            )}

            {requests.length === 0 ? (
              <div className="fv-empty-state">
                <div className="icon">🔒</div>
                <h3>No data requests</h3>
                <p>Requests forwarded by Shopify will appear here.</p>
              </div>
            ) : (
              <table className="fv-table" style={{ width: "100%", marginTop: "16px" }}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Requested</th>
                    <th>Records</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((record) => (
                    <tr key={record.id}>
                      <td>
                        {record.customerEmail ?? "(no email supplied)"}
                        {record.customerId && (
                          <div className="fv-text-sm fv-text-subdued">
                            Shopify customer {record.customerId}
                          </div>
                        )}
                      </td>
                      <td>
                        {new Date(record.requestedAt).toLocaleDateString()}
                        {!record.deliveredAt && record.status !== "no_data" && (
                          <div className="fv-text-sm fv-text-subdued">
                            {record.daysRemaining} day
                            {record.daysRemaining === 1 ? "" : "s"} left
                          </div>
                        )}
                      </td>
                      <td>{record.recordCount}</td>
                      <td>
                        {statusLabel(record.status)}
                        {record.deliveredAt && (
                          <div className="fv-text-sm fv-text-subdued">
                            {new Date(record.deliveredAt).toLocaleDateString()}
                            {record.deliveredTo ? ` → ${record.deliveredTo}` : ""}
                          </div>
                        )}
                        {record.note && (
                          <div className="fv-text-sm fv-text-subdued">{record.note}</div>
                        )}
                      </td>
                      <td>
                        <div className="fv-flex fv-items-center fv-gap-md fv-flex-wrap">
                          {record.hasExport && (
                            <s-button
                              href={`?download=${record.id}`}
                              variant="secondary"
                              target="_blank"
                            >
                              ⬇ Download JSON
                            </s-button>
                          )}
                          {!record.deliveredAt && (
                            <Form method="post" className="fv-flex fv-items-center fv-gap-md">
                              <input type="hidden" name="id" value={record.id} />
                              <input
                                name="deliveredTo"
                                className="fv-input"
                                placeholder="Sent to (email)"
                                style={{ width: "180px" }}
                              />
                              <s-button type="submit">Mark delivered</s-button>
                            </Form>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </s-card>
      </s-section>

      <s-section heading="What FabricVTON stores, and for how long">
        <s-card>
          <div style={{ padding: "20px" }}>
            <ul>
              <li>
                <strong>Shopper photos and generated try-on images:</strong> never
                stored by FabricVTON. The photo is passed to the try-on provider
                (Perfect Corp / YouCam) for processing and the result is served
                from their URL.
              </li>
              <li>
                <strong>Lead email addresses:</strong> kept until you delete them,
                the shop is uninstalled and redacted, or Shopify sends a
                customers/redact request for that shopper. These are yours.
              </li>
              <li>
                <strong>Try-on history:</strong> the email is removed after{" "}
                {retention.tryOnEventEmailDays} days and the anonymous event record
                is deleted after {retention.tryOnEventDays} days.
              </li>
              <li>
                <strong>Daily analytics:</strong> aggregate counts only, deleted
                after {retention.analyticsDailyDays} days.
              </li>
              <li>
                <strong>These request records:</strong> the downloadable export is
                erased {retention.privacyExportPayloadDays} days after delivery;
                the audit entry is kept for {retention.privacyRequestDays} days.
              </li>
            </ul>
          </div>
        </s-card>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
