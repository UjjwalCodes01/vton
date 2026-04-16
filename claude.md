# claude.md

## Overview

**fabricvton** is a B2B Shopify plugin that brings AI-powered virtual try-on capabilities to Shopify merchants. Users can upload their photo and preview garments realistically, building buyer confidence and reducing returns. The plugin targets the rigorous "Built for Shopify" store tag by adhering strictly to Shopify App Bridge, Polaris, Theme App Extensions, and core web vitals performance standards. It is monetized via a tiered SaaS billing model with usage-based overages.

---

## Architecture

### Core Components

| Module             | Stack / Tool                                  | Notes                                    |
|--------------------|-----------------------------------------------|------------------------------------------|
| Shopify Plugin     | Theme App Extension (2.0)                     | No injected Liquid; fast loading         |
| Merchant Dashboard | React + Polaris + App Bridge                  | Native Shopify admin feel                |
| Backend            | Node.js + Express / Remix                     | Built for Shopify standards              |
| Auth & Webhooks    | Shopify OAuth (2026+) + GDPR Webhooks         | Mandatory for store approval             |
| Try-On Model       | Replicate API (initial) -> Custom GCP         | Stateless image flow (privacy-first)     |
| Storage            | PostgreSQL/MongoDB                            | Stores tokens, analytics, captured leads |
| Lead Generation    | Export to CSV / Klaviyo / Mailchimp API       | Merchant ROI feature                     |

---

## Auth and Privacy (Built for Shopify)

- Uses OAuth to generate short-lived `access_token` per shop with session token validation via App Bridge.
- All GDPR webhooks implemented (`customers/data_request`, `customers/redact`, `shop/redact`).
- Privacy-first try-on: Customer images are processed only in-memory (never stored permanently).

---

## Key Features

- **AI Virtual Try-On**: Stateless, highly accurate API flow.
- **Lead Generation**: Captures customer emails prior to returning the stylized virtual try-on "magic". Converts visitors into marketing leads.
- **Deep Analytics**: Tracks try-on usage, email capture rates, and try-on specific conversion impact to prove ROI to the merchant.
- **Widget Customization**: Merchants can customize the try-on button colors, text, and layout directly from the Shopify OS 2.0 Theme Editor.

---

## Monetization Model

- Tiered Membership (e.g., Free, Starter, Pro) using Shopify Billing API.
- **Base Plan**: Includes an allocated number of generations/month (e.g. 100 on Starter).
- **Usage Overages**: App-charge mechanism for additional generation tokens (e.g., $0.15 / try-on over limit). Automatically billed via Shopify upon user consent.

---

## Dashboards

### Merchant Admin
- **Onboarding**: Simple, one-click setup guide verifying the Theme App Extension is active.
- **Settings**: Enable/disable Try-On button, customize widget aesthetics.
- **Analytics**: Dashboard showing interactions, email captures, and subsequent checkouts.
- **Leads**: View and export captured customer emails (CSV, or sync to Klaviyo).
- **Billing**: View current tier limits and manage usage overages.

### Super Admin
- View all stores
- Control model versions
- View global API usage
- Suspend/ban access
- Export billing reports

---

## Deployment Strategy

- Custom domain: `https://www.fabricvton.com`
- HTTPS mandatory
- CDN/image caching layer for frontend assets.
- Resilient model endpoint fetching (retry/backoff if API fails).