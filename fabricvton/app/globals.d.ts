declare module "*.css";

import type { HTMLAttributes, ReactNode } from "react";

type ShopifyElementProps = HTMLAttributes<HTMLElement> & {
  children?: ReactNode;
  [key: string]: unknown;
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "s-app-nav": ShopifyElementProps;
      "s-banner": ShopifyElementProps;
      "s-button": ShopifyElementProps;
      "s-card": ShopifyElementProps;
      "s-link": ShopifyElementProps;
      "s-page": ShopifyElementProps;
      "s-section": ShopifyElementProps;
      "s-text-field": ShopifyElementProps;
    }
  }
}

export {};
