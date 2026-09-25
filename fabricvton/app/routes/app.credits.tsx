import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { allowanceFor } from "../credits.server";
import { getPlan, isBillingCycleDue } from "../billing.server";
import { planLabelFor } from "../customplan.server";
import { formatMoney, invoicesForMerchant } from "../invoices/invoice.server";

/**
 * Where a merchant finds out they have credits to buy.
 *
 * The buying itself happens in the portal on our own domain, because Shopify
 * does not allow taking payment for an app outside its own billing API inside
 * the admin. This page is the doorway: it shows the balance and the invoice,
 * and hands them over authenticated.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await db.shopConfig.findUnique({ where: { shop: session.shop } });
  if (!store) throw new Response("Not found", { status: 404 });

  const rolled = isBillingCycleDue(store.billingCycleStart);
  const invoices = await invoicesForMerchant(session.shop);

  return {
    plan: planLabelFor(store),
    planCredits: getPlan(store.plan).credits,
    allowance: rolled ? store.monthlyCredits : allowanceFor(store),
    topUp: rolled ? 0 : store.cycleTopUpCredits,
    used: rolled ? 0 : store.creditsUsed,
    invoices: invoices.map((i) => ({
      ...i,
      amountLabel: formatMoney(i.amount, i.currency),
      createdAt: new Date(i.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    })),
  };
};

export default function Credits() {
  const data = useLoaderData<typeof loader>();
  const unpaid = data.invoices.filter((i) => i.status === "sent");
  const remaining = Math.max(0, data.allowance - data.used);

  return (
    <s-page heading="Credits">
      <s-section heading="This billing cycle">
        <s-stack gap="small-200">
          <s-stack direction="inline" gap="small-200" alignItems="center">
            <s-heading>{remaining.toLocaleString("en-US")} try-ons left</s-heading>
            <s-badge tone={remaining > 0 ? "success" : "critical"}>
              {remaining > 0 ? "Active" : "Used up"}
            </s-badge>
          </s-stack>
          <s-text color="subdued">
            {data.used.toLocaleString("en-US")} of {data.allowance.toLocaleString("en-US")} used
            {data.topUp > 0
              ? ` — including ${data.topUp.toLocaleString("en-US")} bought this cycle`
              : ""}
            .
          </s-text>
          <s-text color="subdued">
            Your {data.plan} plan includes {data.planCredits.toLocaleString("en-US")} try-ons a month.
            Credits bought on top are for the current cycle.
          </s-text>
        </s-stack>
      </s-section>

      {unpaid.length > 0 && (
        <s-section heading={unpaid.length === 1 ? "You have an invoice to pay" : "You have invoices to pay"}>
          <s-stack gap="base">
            {unpaid.map((invoice) => (
              <s-box key={invoice.id} padding="base" borderWidth="base" borderRadius="base" borderColor="strong">
                <s-stack gap="small-100">
                  <s-heading>
                    {invoice.credits.toLocaleString("en-US")} try-on credits — {invoice.amountLabel}
                  </s-heading>
                  {invoice.description && <s-text color="subdued">{invoice.description}</s-text>}
                  <s-text color="subdued">Issued {invoice.createdAt}</s-text>
                </s-stack>
              </s-box>
            ))}
            <s-link href="/portal/handoff" target="_top">
              <s-button variant="primary">Pay in the billing portal</s-button>
            </s-link>
            <s-text color="subdued">
              Payment opens on our own site, where you are signed in automatically. Credits appear
              here the moment it goes through.
            </s-text>
          </s-stack>
        </s-section>
      )}

      <s-section heading="Past purchases">
        {data.invoices.filter((i) => i.status === "paid").length === 0 ? (
          <s-text color="subdued">Nothing bought yet.</s-text>
        ) : (
          <s-stack gap="small-200">
            {data.invoices
              .filter((i) => i.status === "paid")
              .map((invoice) => (
                <s-stack key={invoice.id} direction="inline" gap="small-200" alignItems="center">
                  <s-text type="strong">{invoice.credits.toLocaleString("en-US")} credits</s-text>
                  <s-text color="subdued">{invoice.amountLabel}</s-text>
                  <s-badge tone="success">Paid</s-badge>
                  <s-text color="subdued">{invoice.createdAt}</s-text>
                </s-stack>
              ))}
          </s-stack>
        )}
      </s-section>

      {unpaid.length === 0 && (
        <s-section heading="Need more try-ons?">
          <s-stack gap="small-200">
            <s-text color="subdued">
              Talk to us and we will send an invoice here for however many you need.
            </s-text>
            <s-link href="/portal/handoff" target="_top">
              <s-button>Open the billing portal</s-button>
            </s-link>
          </s-stack>
        </s-section>
      )}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
