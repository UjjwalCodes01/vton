# FabricVTON Architecture

This document outlines the high-level architecture for building the FabricVTON Shopify Virtual Try-On application. The goal is to build an app that matches the capabilities of competitors like FitMagik and GenLook, while adhering strictly to the "Built for Shopify" performance and security standards.

## 1. Why React? Is it the right choice?

**Yes, React is the absolute best choice for a Shopify App.** Here's why:
- **Shopify Polaris**: Shopify's official design system (Polaris) is a React component library. Using it guarantees your app's dashboard looks and feels exactly like native Shopify settings, which builds immediate trust with merchants.
- **Shopify CLI & Remix**: The modern, official way to build a Shopify App is using **Remix** (a full-stack framework built on React). Shopify heavily supports and maintains the `@shopify/shopify-app-remix` package, which automatically handles the complex OAuth, Webhooks, and Session tokens out of the box.

However, a well-architected Shopify app splits the technologies between the **Admin Dashboard** and the **Storefront Widget**.

---

## 2. System Architecture

The application is split into 4 distinct layers:

### A. Merchant Admin Dashboard (React / Remix / Polaris)
*This is what the store owner sees when they click your app inside their Shopify admin panel.*
- **Tech**: React + Remix + Shopify Polaris + Shopify App Bridge
- **Purpose**: Let merchants configure the plugin. They will use this interface to:
  - Enable/Disable the Try-On button.
  - Choose text, colors, and layout for the storefront widget.
  - View Analytics (how many people clicked Try-On, how many purchases resulted).
  - Export captured customer emails (Lead Generation).

### B. Storefront App Embed Block (Vanilla JS + CSS)
*This is what the end-customer sees on the merchant's store.*
- **Tech**: Shopify Theme App Extension + Vanilla JavaScript / Preact.
- **Purpose**: Injects a "Try It On" button into the merchant's live store without requiring them to edit their theme's core code.
- **Why Vanilla JS?**: To get the **"Built for Shopify"** tag, the widget must load extremely fast and not slow down the merchant's website. Pushing a heavy React bundle to the storefront can hurt load times. Lightweight JS/CSS ensures the try-on modal pops up instantly, captures the lead's email, takes the photo upload, and displays the result with a smooth background blur.

### C. Backend API Server (Node.js / Express / Remix Loader)
*The engine powering the application logic.*
- **Tech**: Node.js ecosystem.
- **Purpose**:
  - Securely handle Shopify authentication and APIs.
  - Process requests from the Storefront widget (receive photo, capture email).
  - Act as a secure proxy to the AI Virtual Try-On Model (e.g., Replicate or your custom GCP models), protecting your API keys.
  - Implement Shopify Billing API to check if the merchant has enough credits in their tier before allowing a generation.
  - Track analytics (button clicks, completions, checkout attribution).

### D. Database Layer
*Where data is stored (Remember: privacy first).*
- **Tech**: PostgreSQL (via Prisma ORM) or MongoDB.
- **Purpose**:
  - Store merchant OAuth `access_tokens` and installation state.
  - Store merchant configurations (widget colors, plan tier limits).
  - Store captured Customer Emails (Leads).
  - Store usage metrics (number of generations performed).
  - **Crucially**: The customer's actual uploaded photo is NEVER permanently stored, ensuring GDPR/privacy compliance.

---

## 3. The Expected User Flow

1. **Shopper** browses a dress on a merchant's store.
2. They click the customized **"Try It On"** button (loaded natively via App Embed).
3. A sleek modal appears with a background blur, asking the shopper to **Enter Email** to unlock the magical experience.
4. The Shopper **Uploads a Photo** of themselves.
5. The widget seamlessly sends the photo to the **Backend API**.
6. The Backend logs the interaction, routes the photo to the **VTON AI Model**, and waits for the result.
7. The Backend returns the resulting realistic preview image to the shopper almost instantly.
8. The shopper closes the modal, feels confident in the fit, and clicks **Add to Cart**.
9. The backend perfectly attributes that sale back to the try-on event, proving the ROI in your app's **Analytics Dashboard**.
