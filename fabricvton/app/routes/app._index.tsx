import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { getPlan } from "../billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let config = await db.shopConfig.findUnique({ where: { shop } });
  if (!config) {
    config = await db.shopConfig.create({ data: { shop } });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayStats = await db.analyticsDaily.findUnique({
    where: { shop_date: { shop, date: today } },
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const weekStats = await db.analyticsDaily.aggregate({
    where: { shop, date: { gte: sevenDaysAgo } },
    _sum: {
      widgetOpens: true,
      emailsCaptured: true,
      tryOnsCompleted: true,
    },
  });

  const totalLeads = await db.lead.count({ where: { shop } });
  const totalTryOns = await db.tryOnEvent.count({ where: { shop } });
  const plan = getPlan(config.plan);
  const creditsRemaining = config.monthlyCredits - config.creditsUsed;

  return {
    shop,
    isEnabled: config.isEnabled,
    plan: plan.label,
    planName: config.plan,
    creditsRemaining,
    monthlyCredits: config.monthlyCredits,
    creditsUsed: config.creditsUsed,
    todayStats: todayStats ?? {
      widgetOpens: 0,
      emailsCaptured: 0,
      tryOnsCompleted: 0,
    },
    weekStats: {
      widgetOpens: weekStats._sum.widgetOpens ?? 0,
      emailsCaptured: weekStats._sum.emailsCaptured ?? 0,
      tryOnsCompleted: weekStats._sum.tryOnsCompleted ?? 0,
    },
    totalLeads,
    totalTryOns,
  };
};

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const creditsPercent = data.monthlyCredits > 0
    ? Math.round((data.creditsUsed / data.monthlyCredits) * 100)
    : 0;
  const isLow = creditsPercent >= 80;

  return (
    <s-page heading="Dashboard">
      {!data.isEnabled && (
        <s-banner tone="warning">
          <p>
            Virtual Try-On is currently <strong>disabled</strong>.{" "}
            <a href="/app/settings">Go to Settings</a> to enable it.
          </p>
        </s-banner>
      )}

      {isLow && data.creditsRemaining > 0 && (
        <s-banner tone="warning">
          <p>
            ⚠️ You&apos;ve used <strong>{creditsPercent}%</strong> of your monthly credits.{" "}
            <a href="/app/billing">Upgrade your plan</a> for more.
          </p>
        </s-banner>
      )}

      {data.creditsRemaining <= 0 && data.planName === "free" && (
        <s-banner tone="critical">
          <p>
            🚫 Monthly credits exhausted.{" "}
            <a href="/app/billing">Upgrade now</a> to continue generating try-ons.
          </p>
        </s-banner>
      )}

      {/* ── Credit Usage ── */}
      <s-section heading="Monthly Credits">
        <s-card>
          <div style={{ padding: "20px" }}>
            <div className="fv-flex fv-justify-between fv-items-center fv-mb-md">
              <div>
                <span style={{ fontSize: "14px", fontWeight: 600 }}>
                  Plan: <span style={{ color: "var(--fv-accent)" }}>{data.plan}</span>
                </span>
              </div>
              <div style={{ fontSize: "14px" }}>
                <strong>{data.creditsUsed}</strong> / {data.monthlyCredits} used
              </div>
            </div>
            <div className="fv-progress-container">
              <div
                className="fv-progress-fill"
                style={{
                  width: `${Math.min(creditsPercent, 100)}%`,
                  background: isLow
                    ? "linear-gradient(135deg, #e53e3e, #fc8181)"
                    : undefined,
                }}
              />
            </div>
            <div className="fv-flex fv-justify-between fv-mt-sm">
              <span className="fv-text-sm fv-text-subdued">
                {data.creditsRemaining} remaining
              </span>
              <span className="fv-text-sm fv-text-subdued">{creditsPercent}%</span>
            </div>
          </div>
        </s-card>
      </s-section>

      {/* ── Today's Activity ── */}
      <s-section heading="Today's Activity">
        <div className="fv-kpi-grid">
          <div className="fv-kpi-card">
            <div className="fv-kpi-value">{data.todayStats.widgetOpens}</div>
            <div className="fv-kpi-label">Widget Opens</div>
          </div>
          <div className="fv-kpi-card">
            <div className="fv-kpi-value accent">{data.todayStats.tryOnsCompleted}</div>
            <div className="fv-kpi-label">Try-Ons</div>
          </div>
          <div className="fv-kpi-card">
            <div className="fv-kpi-value success">{data.todayStats.emailsCaptured}</div>
            <div className="fv-kpi-label">Emails Captured</div>
          </div>
        </div>
      </s-section>

      {/* ── Last 7 Days ── */}
      <s-section heading="Last 7 Days">
        <div className="fv-kpi-grid">
          <div className="fv-kpi-card">
            <div className="fv-kpi-value">{data.weekStats.widgetOpens}</div>
            <div className="fv-kpi-label">Widget Opens</div>
          </div>
          <div className="fv-kpi-card">
            <div className="fv-kpi-value accent">{data.weekStats.tryOnsCompleted}</div>
            <div className="fv-kpi-label">Try-Ons</div>
          </div>
          <div className="fv-kpi-card">
            <div className="fv-kpi-value success">{data.weekStats.emailsCaptured}</div>
            <div className="fv-kpi-label">Emails Captured</div>
          </div>
          <div className="fv-kpi-card">
            <div className="fv-kpi-value">{data.totalLeads}</div>
            <div className="fv-kpi-label">Total Leads</div>
          </div>
        </div>
      </s-section>

      {/* ── Quick Actions ── */}
      <s-section slot="aside" heading="Quick Actions">
        <s-card>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <s-button href="/app/settings" variant="primary">
              ⚙️ Configure Widget
            </s-button>
            <s-button href="/app/leads">
              📧 View & Export Leads
            </s-button>
            <s-button href="/app/analytics">
              📊 Full Analytics
            </s-button>
            <s-button href="/app/billing">
              💳 Manage Plan
            </s-button>
          </div>
        </s-card>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
