import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { markDataRequestDelivered } from "../privacy.server";
import { RETENTION } from "../retention.server";
import { useDownload } from "../download";
import { formatDate } from "../format";

// The merchant-facing half of the customers/data_request workflow.
//
// Shopify sends the request to us, but the legal obligation to answer the shopper
// within 30 days is the merchant's. This page is how they discharge it: see the
// request, download what we hold, and record that they delivered it — which is
// the part that makes the workflow auditable rather than best-effort.

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // The export payloads can be large, and this page only needs to know which
  // requests have one, so the blob column is never read here. Downloads are
  // served by the /app/privacy/export resource route.
  const [requests, withExport] = await Promise.all([
    db.privacyRequest.findMany({
      where: { shop },
      orderBy: { requestedAt: "desc" },
      take: 100,
      select: {
        id: true,
        customerEmail: true,
        customerId: true,
        status: true,
        recordCount: true,
        requestedAt: true,
        deliveredAt: true,
        deliveredTo: true,
        note: true,
      },
    }),
    db.privacyRequest.findMany({
      where: { shop, exportJson: { not: null } },
      select: { id: true },
    }),
  ]);
  const exportable = new Set(withExport.map((record) => record.id));

  return {
    requests: requests.map((record) => ({
      ...record,
      requestedAt: record.requestedAt.toISOString(),
      deliveredAt: record.deliveredAt?.toISOString() ?? null,
      hasExport: exportable.has(record.id),
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

type RequestRecord = ReturnType<typeof useLoaderData<typeof loader>>["requests"][number];

function StatusBadge({ status }: { status: string }) {
  if (status === "delivered") return <s-badge tone="success">Delivered</s-badge>;
  if (status === "no_data") return <s-badge tone="neutral">No data held</s-badge>;
  return <s-badge tone="warning">Awaiting delivery</s-badge>;
}

function RequestRow({
  record,
  onDownload,
  downloading,
}: {
  record: RequestRecord;
  onDownload: (id: string) => void;
  downloading: boolean;
}) {
  // One fetcher per row, so marking one request delivered doesn't put every
  // row's button into a loading state.
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const result = fetcher.data;

  useEffect(() => {
    if (result) shopify.toast.show(result.message, { isError: !result.success });
  }, [result, shopify]);

  const isOpen = !record.deliveredAt && record.status !== "no_data";

  return (
    <s-table-row>
      <s-table-cell>
        <s-stack gap="small-100">
          <s-text>{record.customerEmail ?? "No email supplied"}</s-text>
          {record.customerId && (
            <s-text color="subdued">Shopify customer {record.customerId}</s-text>
          )}
        </s-stack>
      </s-table-cell>
      <s-table-cell>
        <s-stack gap="small-100">
          <s-text>{formatDate(record.requestedAt)}</s-text>
          {isOpen && (
            <s-text color="subdued">
              {record.daysRemaining} day{record.daysRemaining === 1 ? "" : "s"} left
            </s-text>
          )}
        </s-stack>
      </s-table-cell>
      <s-table-cell>{record.recordCount}</s-table-cell>
      <s-table-cell>
        <s-stack gap="small-100">
          <StatusBadge status={record.status} />
          {record.deliveredAt && (
            <s-text color="subdued">
              {formatDate(record.deliveredAt)}
              {record.deliveredTo ? ` to ${record.deliveredTo}` : ""}
            </s-text>
          )}
          {record.note && <s-text color="subdued">{record.note}</s-text>}
        </s-stack>
      </s-table-cell>
      <s-table-cell>
        <s-stack gap="small-200">
          {record.hasExport && (
            <s-button icon="export" loading={downloading} onClick={() => onDownload(record.id)}>
              Download
            </s-button>
          )}
          {!record.deliveredAt && (
            <fetcher.Form method="post">
              <input type="hidden" name="id" value={record.id} />
              <s-stack direction="inline" gap="small-200" alignItems="end">
                <s-email-field
                  name="deliveredTo"
                  label="Sent to"
                  labelAccessibilityVisibility="exclusive"
                  placeholder="Sent to (email)"
                />
                <s-button type="submit" loading={fetcher.state !== "idle"}>
                  Mark delivered
                </s-button>
              </s-stack>
            </fetcher.Form>
          )}
        </s-stack>
      </s-table-cell>
    </s-table-row>
  );
}

export default function Privacy() {
  const { requests, retention } = useLoaderData<typeof loader>();
  const { download, pending } = useDownload();
  const open = requests.filter((record) => !record.deliveredAt && record.status !== "no_data");

  const downloadPath = (id: string) => `/app/privacy/export?id=${encodeURIComponent(id)}`;

  return (
    <s-page heading="Privacy requests">
      <s-section heading="Customer data requests">
        <s-stack gap="base">
          <s-paragraph>
            When a shopper asks your store for their data, Shopify notifies
            Clothsy AI and we compile everything we hold for that email address.
            Download it, send it to the shopper, then mark it delivered here so you
            have a record of having answered. Shopify expects a response within 30
            days of the request.
          </s-paragraph>

          {open.length > 0 && (
            <s-banner tone="warning">
              {open.length} request{open.length === 1 ? "" : "s"} awaiting delivery.
            </s-banner>
          )}

          {requests.length === 0 ? (
            <s-stack gap="small-200">
              <s-heading>No data requests</s-heading>
              <s-paragraph>Requests forwarded by Shopify will appear here.</s-paragraph>
            </s-stack>
          ) : (
            <s-table>
              <s-table-header-row>
                <s-table-header listSlot="primary">Customer</s-table-header>
                <s-table-header>Requested</s-table-header>
                <s-table-header format="numeric">Records</s-table-header>
                <s-table-header>Status</s-table-header>
                <s-table-header>Actions</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {requests.map((record) => (
                  <RequestRow
                    key={record.id}
                    record={record}
                    downloading={pending === downloadPath(record.id)}
                    onDownload={(id) =>
                      download(downloadPath(id), `clothsy-ai-data-request-${id}.json`)
                    }
                  />
                ))}
              </s-table-body>
            </s-table>
          )}
        </s-stack>
      </s-section>

      <s-section heading="What Clothsy AI stores, and for how long">
        <s-unordered-list>
          <s-list-item>
            <s-text type="strong">Shopper photos and generated try-on images:</s-text>{" "}
            never stored by Clothsy AI. The photo is passed to the try-on provider
            (our AI image-processing provider) for processing and the result is served from
            their URL.
          </s-list-item>
          <s-list-item>
            <s-text type="strong">Lead email addresses:</s-text> kept until you
            delete them, the shop is uninstalled and redacted, or Shopify sends a
            customers/redact request for that shopper. These are yours.
          </s-list-item>
          <s-list-item>
            <s-text type="strong">Try-on history:</s-text> the email is removed
            after {retention.tryOnEventEmailDays} days and the anonymous event
            record is deleted after {retention.tryOnEventDays} days.
          </s-list-item>
          <s-list-item>
            <s-text type="strong">Daily analytics:</s-text> aggregate counts only,
            deleted after {retention.analyticsDailyDays} days.
          </s-list-item>
          <s-list-item>
            <s-text type="strong">These request records:</s-text> the downloadable
            export is erased {retention.privacyExportPayloadDays} days after
            delivery; the audit entry is kept for {retention.privacyRequestDays} days.
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
