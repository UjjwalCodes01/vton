import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { getPlan } from "../billing.server";
import { themeEditorAddBlockUrl } from "../theme-editor.server";
import { Metric } from "../components/Metric";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const config =
    (await db.shopConfig.findUnique({ where: { shop } })) ??
    (await db.shopConfig.create({ data: { shop } }));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Independent reads, so they run concurrently: this loader is on the critical
  // path of the app's first paint, which Shopify measures as admin LCP.
  const [todayStats, weekStats, allTimeOpens, totalLeads, totalTryOns] =
    await Promise.all([
      db.analyticsDaily.findUnique({ where: { shop_date: { shop, date: today } } }),
      db.analyticsDaily.aggregate({
        where: { shop, date: { gte: sevenDaysAgo } },
        _sum: { widgetOpens: true, emailsCaptured: true, tryOnsCompleted: true },
      }),
      db.analyticsDaily.aggregate({ where: { shop }, _sum: { widgetOpens: true } }),
      db.lead.count({ where: { shop } }),
      db.tryOnEvent.count({ where: { shop } }),
    ]);

  // No widget activity ever recorded means the merchant most likely hasn't added
  // the app block to their theme yet — the #1 reason a new install looks
  // "broken" — so the setup guide stays until there is a real signal.
  const needsSetup = (allTimeOpens._sum.widgetOpens ?? 0) === 0 && totalTryOns === 0;

  return {
    needsSetup,
    themeEditorUrl: themeEditorAddBlockUrl(shop),
    isEnabled: config.isEnabled,
    planLabel: getPlan(config.plan).label,
    monthlyCredits: config.monthlyCredits,
    creditsUsed: config.creditsUsed,
    today: {
      widgetOpens: todayStats?.widgetOpens ?? 0,
      tryOnsCompleted: todayStats?.tryOnsCompleted ?? 0,
      emailsCaptured: todayStats?.emailsCaptured ?? 0,
    },
    week: {
      widgetOpens: weekStats._sum.widgetOpens ?? 0,
      tryOnsCompleted: weekStats._sum.tryOnsCompleted ?? 0,
      emailsCaptured: weekStats._sum.emailsCaptured ?? 0,
    },
    totalLeads,
  };
};

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const creditsRemaining = Math.max(0, data.monthlyCredits - data.creditsUsed);
  const creditsPercent =
    data.monthlyCredits > 0 ? Math.round((data.creditsUsed / data.monthlyCredits) * 100) : 0;
  const isLow = creditsPercent >= 80 && creditsRemaining > 0;

  // The theme editor is a top-level admin page, so it must replace the admin
  // frame rather than load inside the app's iframe.
  const openThemeEditor = () => window.open(data.themeEditorUrl, "_top");

  return (
    <s-page heading="Dashboard">
      {data.needsSetup && (
        <s-section heading="Finish setting up Clothsy AI">
          <s-stack gap="base">
            <s-paragraph>
              The try-on button won&apos;t appear on your storefront until the
              Clothsy AI block is on your product page. It takes about a minute.
            </s-paragraph>
            <s-ordered-list>
              <s-list-item>
                Select <s-text type="strong">Add try-on button</s-text>. The theme
                editor opens with the block already added to your product page.
              </s-list-item>
              <s-list-item>Drag it next to your Add to cart button if you like.</s-list-item>
              <s-list-item>
                Select <s-text type="strong">Save</s-text> in the theme editor.
              </s-list-item>
            </s-ordered-list>
            <s-stack direction="inline" gap="base" alignItems="center">
              <s-button variant="primary" onClick={openThemeEditor}>
                Add try-on button
              </s-button>
              <s-text color="subdued">
                This guide disappears once your first shopper opens the try-on.
              </s-text>
            </s-stack>
          </s-stack>
        </s-section>
      )}

      {!data.isEnabled && (
        <s-banner tone="warning" heading="Virtual try-on is turned off">
          <s-paragraph>
            Shoppers can&apos;t start a try-on until you turn it back on.
          </s-paragraph>
          <s-button slot="secondary-actions" href="/app/settings">
            Go to settings
          </s-button>
        </s-banner>
      )}

      {isLow && (
        <s-banner tone="warning" heading={`You've used ${creditsPercent}% of this month's try-ons`}>
          <s-paragraph>Upgrade your plan to keep try-ons running for the rest of the cycle.</s-paragraph>
          <s-button slot="secondary-actions" href="/app/billing">
            View plans
          </s-button>
        </s-banner>
      )}

      {creditsRemaining <= 0 && data.monthlyCredits > 0 && (
        <s-banner tone="critical" heading="This month's try-ons are used up">
          <s-paragraph>
            Try-ons are paused until your next billing cycle. Upgrade your plan to
            resume them now.
          </s-paragraph>
          <s-button slot="secondary-actions" href="/app/billing">
            View plans
          </s-button>
        </s-banner>
      )}

      <s-section heading="Monthly try-ons">
        <s-stack gap="small-200">
          <s-stack direction="inline" gap="small-200" alignItems="center">
            <s-heading>{creditsRemaining.toLocaleString()} remaining</s-heading>
            <s-badge tone={creditsRemaining <= 0 ? "critical" : isLow ? "warning" : "success"}>
              {data.planLabel} plan
            </s-badge>
          </s-stack>
          <s-text color="subdued">
            {data.creditsUsed.toLocaleString()} of {data.monthlyCredits.toLocaleString()} used
            this billing cycle ({creditsPercent}%)
          </s-text>
        </s-stack>
      </s-section>

      <s-section heading="Today">
        <s-grid gridTemplateColumns="repeat(auto-fit, minmax(160px, 1fr))" gap="base">
          <Metric label="Try-on opens" value={data.today.widgetOpens} />
          <Metric label="Try-ons completed" value={data.today.tryOnsCompleted} />
          <Metric label="Emails captured" value={data.today.emailsCaptured} />
        </s-grid>
      </s-section>

      <s-section heading="Last 7 days">
        <s-grid gridTemplateColumns="repeat(auto-fit, minmax(160px, 1fr))" gap="base">
          <Metric label="Try-on opens" value={data.week.widgetOpens} />
          <Metric label="Try-ons completed" value={data.week.tryOnsCompleted} />
          <Metric label="Emails captured" value={data.week.emailsCaptured} />
          <Metric label="Total leads" value={data.totalLeads} />
        </s-grid>
      </s-section>

      <s-section slot="aside" heading="Shortcuts">
        <s-stack gap="small-200">
          <s-link href="/app/analytics">View analytics</s-link>
          <s-link href="/app/leads">View and export leads</s-link>
          <s-link href="/app/settings">Settings</s-link>
          <s-link href="/app/billing">Plans and billing</s-link>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
