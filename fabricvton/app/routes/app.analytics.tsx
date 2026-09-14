import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { ANALYTICS_RANGES, parseDays } from "../analytics-range";
import { Metric } from "../components/Metric";
import { useDownload } from "../download";
import { formatDate } from "../format";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const days = parseDays(new URL(request.url).searchParams.get("days"));

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const where = { shop, date: { gte: startDate } };

  const [dailyStats, totals] = await Promise.all([
    db.analyticsDaily.findMany({ where, orderBy: { date: "desc" } }),
    db.analyticsDaily.aggregate({
      where,
      _sum: {
        widgetOpens: true,
        emailsCaptured: true,
        tryOnsCompleted: true,
        tryOnsFailed: true,
      },
    }),
  ]);

  const opens = totals._sum.widgetOpens ?? 0;
  const completions = totals._sum.tryOnsCompleted ?? 0;
  const emailsCaptured = totals._sum.emailsCaptured ?? 0;
  const percentOfOpens = (n: number) => (opens > 0 ? ((n / opens) * 100).toFixed(1) : "0.0");

  return {
    days,
    dailyStats: dailyStats.map((row) => ({
      id: row.id,
      date: row.date.toISOString(),
      widgetOpens: row.widgetOpens,
      tryOnsCompleted: row.tryOnsCompleted,
      emailsCaptured: row.emailsCaptured,
      tryOnsFailed: row.tryOnsFailed,
    })),
    totals: {
      opens,
      completions,
      emailsCaptured,
      failed: totals._sum.tryOnsFailed ?? 0,
    },
    completionRate: percentOfOpens(completions),
    emailCaptureRate: percentOfOpens(emailsCaptured),
  };
};

export default function Analytics() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { download, pending } = useDownload();

  return (
    <s-page heading="Analytics">
      <s-button
        slot="secondary-actions"
        icon="export"
        loading={pending !== null}
        disabled={data.dailyStats.length === 0}
        onClick={() =>
          download(`/app/analytics/export?days=${data.days}`, `clothsy-ai-analytics-${data.days}d.csv`)
        }
      >
        Export CSV
      </s-button>

      <s-section heading={`Last ${data.days} days`}>
        <s-stack gap="base">
          <s-stack direction="inline" gap="small-200">
            {ANALYTICS_RANGES.map((range) => (
              <s-press-button
                key={range}
                pressed={range === data.days}
                onClick={() => navigate(`?days=${range}`)}
              >
                {`${range} days`}
              </s-press-button>
            ))}
          </s-stack>

          <s-grid gridTemplateColumns="repeat(auto-fit, minmax(160px, 1fr))" gap="base">
            <Metric label="Try-on opens" value={data.totals.opens} />
            <Metric
              label="Try-ons completed"
              value={data.totals.completions}
              detail={`${data.completionRate}% of opens`}
            />
            <Metric
              label="Emails captured"
              value={data.totals.emailsCaptured}
              detail={`${data.emailCaptureRate}% of opens`}
            />
            <Metric
              label="Failed try-ons"
              value={data.totals.failed}
              detail="Usually an unusable photo"
            />
          </s-grid>
        </s-stack>
      </s-section>

      <s-section heading="Daily breakdown" padding="none">
        {data.dailyStats.length === 0 ? (
          <s-box padding="base">
            <s-stack gap="small-200">
              <s-heading>No activity in this period</s-heading>
              <s-paragraph>
                Daily numbers appear here once shoppers start using the try-on
                button on your product pages.
              </s-paragraph>
            </s-stack>
          </s-box>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header listSlot="primary">Date</s-table-header>
              <s-table-header format="numeric">Try-on opens</s-table-header>
              <s-table-header format="numeric">Try-ons completed</s-table-header>
              <s-table-header format="numeric">Emails captured</s-table-header>
              <s-table-header format="numeric">Failed</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {data.dailyStats.map((row) => (
                <s-table-row key={row.id}>
                  <s-table-cell>{formatDate(row.date)}</s-table-cell>
                  <s-table-cell>{row.widgetOpens}</s-table-cell>
                  <s-table-cell>{row.tryOnsCompleted}</s-table-cell>
                  <s-table-cell>{row.emailsCaptured}</s-table-cell>
                  <s-table-cell>
                    {row.tryOnsFailed > 0 ? (
                      <s-badge tone="critical">{row.tryOnsFailed}</s-badge>
                    ) : (
                      0
                    )}
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
