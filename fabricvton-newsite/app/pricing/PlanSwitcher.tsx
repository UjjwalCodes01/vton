"use client";

import { useState } from "react";
import { ArrowUpRight, Check } from "../components/icons";
import { PLANS, type Plan } from "../lib/content";
import { SHOPIFY_URL } from "../lib/site";

/**
 * The plan cards, billing toggle and comparison table. Plans and prices mirror the Shopify billing code:
 * five tiers, a hard monthly allowance of try-ons, and yearly billing on Shopify only.
 */

type Period = "monthly" | "yearly";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const perTryOn = (plan: Plan) => (plan.monthly === 0 ? null : plan.monthly / plan.tryOns);
const cents = (n: number) => `$${n.toFixed(2)}`;

function Price({ plan, period }: { plan: Plan; period: Period }) {
  if (plan.monthly === 0) {
    return (
      <div className="plan-price">
        <b>$0</b>
        <span>free</span>
      </div>
    );
  }
  const yearly = period === "yearly" && plan.yearly != null;
  return (
    <div className="plan-price" key={period}>
      <b className="price-in">{usd(yearly ? plan.yearly! : plan.monthly)}</b>
      <span>{yearly ? "/year" : "/month"}</span>
    </div>
  );
}

export default function PlanSwitcher() {
  const [period, setPeriod] = useState<Period>("monthly");

  return (
    <>
      <div className="plan-switch">
        <div className="plan-switch-inner" role="group" aria-label="Billing period">
          <button type="button" aria-pressed={period === "monthly"} onClick={() => setPeriod("monthly")}>
            Monthly
          </button>
          <button type="button" aria-pressed={period === "yearly"} onClick={() => setPeriod("yearly")}>
            Yearly <span className="save">Save about 20%</span>
          </button>
        </div>
      </div>

      <div className="plan-grid">
        {PLANS.map((plan) => {
          const each = perTryOn(plan);
          const yearlyMonthly = period === "yearly" && plan.yearly != null ? Math.round(plan.yearly / 12) : null;
          return (
            <article className={`plan${plan.featured ? " is-featured" : ""}`} key={plan.name}>
              <div className="plan-head">
                <span className="plan-name">{plan.name}</span>
              </div>
              <p className="plan-for">{plan.blurb}</p>

              <Price plan={plan} period={period} />
              <p className="plan-sub">{yearlyMonthly ? `About ${usd(yearlyMonthly)} a month, billed yearly` : plan.monthly === 0 ? "No card needed to start" : "Billed monthly"}</p>

              <div className="plan-stats">
                <div>
                  <b>{plan.tryOns.toLocaleString("en-US")}</b>
                  <span>try-ons / month</span>
                </div>
                <div>
                  <b>{each ? cents(each) : "Free"}</b>
                  <span>{each ? "per try-on, if fully used" : "to try it out"}</span>
                </div>
              </div>

              <a className={`btn ${plan.featured ? "btn-dark" : "btn-ghost"}`} href={SHOPIFY_URL} target="_blank" rel="noopener noreferrer">
                {plan.monthly === 0 ? "Start free" : `Choose ${plan.name}`} <ArrowUpRight className="btn-arrow" />
              </a>

              <p className="plan-included">WHAT’S INCLUDED</p>
              <ul className="plan-list">
                <li>
                  <Check />
                  {plan.tryOns.toLocaleString("en-US")} try-ons every month
                </li>
                <li>
                  <Check />
                  Lead capture and analytics
                </li>
                {plan.support ? (
                  <li>
                    <Check />
                    {plan.support}
                  </li>
                ) : null}
              </ul>
            </article>
          );
        })}
      </div>

      <div className="plan-table-wrap">
        <table className="plan-table">
          <caption>Compare plans</caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Feature</span>
              </th>
              {PLANS.map((plan) => (
                <th scope="col" key={plan.name}>
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Try-ons per month</th>
              {PLANS.map((plan) => (
                <td key={plan.name}>{plan.tryOns.toLocaleString("en-US")}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Price per month</th>
              {PLANS.map((plan) => (
                <td key={plan.name}>{plan.monthly === 0 ? "Free" : usd(plan.monthly)}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Per try-on, if fully used</th>
              {PLANS.map((plan) => {
                const each = perTryOn(plan);
                return <td key={plan.name}>{each ? cents(each) : "-"}</td>;
              })}
            </tr>
            <tr>
              <th scope="row">Lead capture and analytics</th>
              {PLANS.map((plan) => (
                <td key={plan.name}>
                  <Check className="tbl-check" />
                  <span className="sr-only">Included</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="plan-fine">
        Prices in USD. Your allowance is your limit: there are no surprise charges. Yearly billing is available on Shopify; WooCommerce plans are billed monthly. Scale includes priority support.
      </p>
    </>
  );
}
