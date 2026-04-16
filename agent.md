# agent.md

## Project: fabricvton – Shopify Virtual Try-On App

This document contains execution-level instructions for developers or agents working on the project.

---

## GOAL

Build a **Shopify App Plugin** from scratch that allows merchants to embed a "Virtual Try-On" feature on product pages. The application *must* qualify for the **"Built for Shopify"** tag (App Bridge, Polaris components, Theme App Extensions, zero Liquid injection, < 2.5s LCP impact). 

The app must include highly requested ROI features such as Email Lead Capture, Conversion Analytics, Widget Customization, and a Tiered + Overage SaaS billing model via the Shopify Billing API.

---

## TECH STACK

- **Frontend (Admin)**: React + Shopify Polaris + Shopify App Bridge
- **Frontend (Storefront)**: Theme App Extension (App Embed Block + Custom Schema settings)
- **Backend**: Node.js + Express (or Shopify Remix Template)
- **Database**: PostgreSQL or MongoDB (store configuration, tokens, usage logging, leads data)
- **Model API**: Replicate (initial), replaceable later with GCP
- **Billing**: Shopify Billing API (Recurring Application Charge + Usage Charges)
- **Integrations**: CSV export immediately, Klaviyo/Mailchimp (Phase 1.5)

---

## DEV SETUP

1. Clone the private repo (or scaffold a new app via `npm init @shopify/app@latest`).
2. Link the app to your environment using `shopify app config link`.
3. Use `.env` to store necessary keys:
   - `SHOPIFY_API_KEY`
   - `SHOPIFY_API_SECRET`
   - `SCOPES` (read_products, write_script_tags, etc.)
   - `HOST=https://www.fabricvton.com`
   - `VTON_API_KEY`
4. Set up DB connection handling per the chosen stack setup.

---

## MODULES TO IMPLEMENT

### Phase 1A: Core Foundation & "Built for Shopify"
- OAuth flow + Session Token handling.
- Mandatory GDPR Webhooks implemented via EventBridge or HTTP (`shop/redact`, `customers/redact`, `customers/data_request`).
- DB schema layout for Shops, Subscriptions, Usage logs, and Captured Leads.

### Phase 1B: Storefront Extension & Lead Generation
- App Embed Block to render the "Try-On" button dynamically.
- Theme Editor `schema` configuration for Widget Customization (button colors, width, text).
- **Email Capture Flow**: Display modal requiring an email input *before* generating the try-on result.
- Mobile responsiveness, background blur, and optimized asset loading so store performance is untaxed.

### Phase 1C: Backend Implementation & Analytics
- `/api/tryon`: Authenticates storefront request → accepts image → captures email into DB → calls model API → returns output (stateless image processing).
- `/api/analytics`: Fire-and-forget endpoints to log modal opens, successful generations, and order completion (via order webhooks for try-on conversion attributions).
- Admin UI Dashboard: Render Charts for Analytics and Datatables for Leads export.

### Phase 1D: Billing Orchestration
- Integrate Shopify Billing API.
- Set up Base plans (Free, Starter, Pro).
- Implement Usage Charges (capped amount per month for overage tokens).
- Gate generation endpoints when plan limits are exceeded without a usage approval.

### Phase 1E: Deployment
- Deploy to `https://www.fabricvton.com` utilizing CDNs.
- Optimize LCP and script loading latency for "Built for Shopify" speed requirements.

---

## RESPONSIVENESS AND PERFORMANCE

- Full mobile support imperative.
- Storefront JS bundle must be highly optimized and async-loaded so it never blocks the main rendering thread of the Shopify OS 2.0 merchant theme.