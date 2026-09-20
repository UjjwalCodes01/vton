export type TgmProduct = {
  id: number;
  label: string;
  sku: string;
  productUrl: string;
  compositeUrl: string;
};

export type TgmStat = {
  value: string;
  label: string;
};

export type TgmStep = {
  n: string;
  icon: string;
  title: string;
  body: string;
};

export const TGM_PRODUCTS: TgmProduct[] = [
  {
    id: 1,
    label: "Look 01",
    sku: "S106NV16PFRMN",
    productUrl:
      "https://cdn.shopify.com/s/files/1/0273/2661/1491/files/S106NV16PFRMN_7.jpg",
    compositeUrl: "/tgm/1_tgm.png",
  },
  {
    id: 2,
    label: "Look 02",
    sku: "S2075V16PFRWM",
    productUrl:
      "https://cdn.shopify.com/s/files/1/0273/2661/1491/files/S2075V16PFRWM_7.jpg",
    compositeUrl: "/tgm/2_tgm.png",
  },
  {
    id: 3,
    label: "Look 03",
    sku: "S2077V16OLVWM",
    productUrl:
      "https://cdn.shopify.com/s/files/1/0273/2661/1491/files/S2077V16OLVWM_5.jpg",
    compositeUrl: "/tgm/3_tgm.png",
  },
];

export const TGM_STATS: TgmStat[] = [
  { value: "~6s", label: "Generation" },
  { value: "98%", label: "Fit accuracy" },
  { value: "1 photo", label: "Input needed" },
];

export const TGM_STEPS: TgmStep[] = [
  {
    n: "1",
    icon: "🖼️",
    title: "One product photo",
    body: "Just the Shopify CDN image — no model, no studio.",
  },
  {
    n: "2",
    icon: "⚡",
    title: "AI processes in ~6s",
    body: "Our model detects fabric, texture, drape and fit.",
  },
  {
    n: "3",
    icon: "🧍",
    title: "Placed on real model",
    body: "Photorealistic output with natural lighting and pose.",
  },
  {
    n: "4",
    icon: "🛍️",
    title: "Live on your PDP",
    body: "Shoppers try before they buy — zero redirects.",
  },
];
