/**
 * Copy that changes, kept out of the components. Nothing here is an invented claim: no customer names,
 * numbers, ratings, testimonials, accuracy or processing times. Each statement is backed by the shipped
 * widget code, the billing code or the published shopper privacy policy. Where a capability is only shown
 * in the interactive preview it carries a `status` from lib/site.ts.
 */
import { STATUS, type Status } from "./site";

/* ---------------- home: shopper questions ---------------- */

export type Question =
  | { q: string; a: string; kind: "pair" }
  | { q: string; a: string; kind: "toggle" }
  | { q: string; a: string; kind: "switch"; shopper: "denim" | "shirts"; looks: number[] };

export const QUESTIONS: Question[] = [
  { q: "Will this look good on me?", a: "See the piece on you, not on a model.", kind: "pair" },
  { q: "Try it before you decide.", a: "Your photo and the try-on, one tap apart.", kind: "toggle" },
  { q: "I want to see another colour.", a: "Swap the piece. Your photo stays put.", kind: "switch", shopper: "denim", looks: [1, 4, 5] },
  { q: "Show me another outfit.", a: "Same you, next look.", kind: "switch", shopper: "shirts", looks: [1, 3, 6] },
];

/* ---------------- home: how it works (describes the shipped flow) ---------------- */

export const HOW_STEPS = [
  {
    no: "01",
    title: "Your photo",
    copy: "Choose one clear photo of you, facing the camera. It stays in your browser until you agree to send it.",
  },
  {
    no: "02",
    title: "Choose your look",
    copy: "Pick a piece in the store and press Try it on. Clothsy tries that product on you.",
  },
  {
    no: "03",
    title: "See it on you",
    copy: "Your look appears on your photo. Shop now takes you straight back to the product.",
  },
] as const;

/* ---------------- features ---------------- */

export type Feature = { title: string; blurb: string; status: Status };

/** Organised around what the shopper gains. `status` follows lib/site.ts. */
export const SHOPPER_FEATURES: Feature[] = [
  {
    title: "See it on you",
    blurb: "One photo turns the product page into a personal fitting room. Press Try it on, add your photo, and see the piece on you.",
    status: STATUS.seeItOnYou,
  },
  {
    title: "Keep exploring",
    blurb: "Try piece after piece without uploading again. Your photo stays with you for the visit.",
    status: STATUS.keepPhoto,
  },
  {
    title: "Compare",
    blurb: "Flip between your original photo and the try-on, side by side or one tap apart.",
    status: STATUS.compare,
  },
  {
    title: "Shop the look",
    blurb: "When your look is ready, Shop now takes you straight back to the product page you were on.",
    status: STATUS.shopNow,
  },
  {
    title: "Share",
    blurb: "Send a look to a friend with your device's own share sheet, or save the image.",
    status: STATUS.share,
  },
  {
    title: "Personal session",
    blurb: "Your photo and the looks you have tried stay available while you shop, and go when you leave.",
    status: STATUS.sessionLooks,
  },
];

export const STORE_FEATURES: { title: string; blurb: string }[] = [
  {
    title: "A button that feels like yours",
    blurb: "Set the label, button colour, text colour and corner radius. The font comes from your theme's button styles.",
  },
  {
    title: "Put it where it belongs",
    blurb: "On Shopify, add the Try it on block to your product template. On WooCommerce it appears below Add to cart, or place it with a block or shortcode.",
  },
  {
    title: "Capture leads, if you want them",
    blurb: "Ask for an email before a try-on runs. On Shopify, see every lead with the product it was for, and export the list as a CSV.",
  },
  {
    title: "See how it is doing",
    blurb: "Track how often the widget is opened, emails captured, and try-ons completed or failed, over 7, 14 or 30 days.",
  },
  {
    title: "Consent first",
    blurb: "Shoppers tick a consent box before anything is sent. Photos and results are never stored by FabricVTON.",
  },
  {
    title: "Free to start",
    blurb: "Every store starts on Basic with 15 try-ons a month. Move up when your shoppers do. The allowance is your limit, so there are no surprise charges.",
  },
];

/* ---------------- pricing (source: the Shopify billing code) ---------------- */

export type Plan = {
  name: string;
  monthly: number;
  yearly: number | null;
  tryOns: number;
  blurb: string;
  featured?: boolean;
  support: string | null;
};

export const PLANS: Plan[] = [
  { name: "Basic", monthly: 0, yearly: null, tryOns: 15, blurb: "Try it out on your store.", support: null },
  { name: "Starter", monthly: 19.99, yearly: 191.9, tryOns: 250, blurb: "For a small catalogue.", support: "Standard support" },
  { name: "Growth", monthly: 49.99, yearly: 479.9, tryOns: 750, blurb: "For a store finding its rhythm.", featured: true, support: "Standard support" },
  { name: "Pro", monthly: 99.99, yearly: 959.9, tryOns: 2000, blurb: "For a busy storefront.", support: "Standard support" },
  { name: "Scale", monthly: 199, yearly: 1910.4, tryOns: 4250, blurb: "For high traffic.", support: "Priority support" },
];

/* ---------------- FAQ ---------------- */

export type Faq = { q: string; a: string };

export const SHOPPER_FAQ: Faq[] = [
  {
    q: "What do I need to try something on?",
    a: "One clear photo of you: just you in the shot, facing the camera, standing upright, with your face and shoulders in frame. JPG or PNG, up to 10 MB, and at least 512 pixels on the long side.",
  },
  {
    q: "Is my photo stored?",
    a: "No. FabricVTON never stores your photo or your try-on image. Your photo goes to our AI image-processing provider to create the look, and neither they nor we use it to train AI models. The store cannot see your photo or your result.",
  },
  {
    q: "Does anything get sent as soon as I choose a photo?",
    a: "No. Choosing a photo only shows it to you, inside your own browser. It is sent when you tick the consent box and press Generate.",
  },
  {
    q: "Do I have to give my email?",
    a: "Some stores ask for one before the try-on runs. Where a store turns this on, your email goes to that store as a marketing lead, along with the product you were viewing. If you would rather not share it, don't use try-on on that store.",
  },
  {
    q: "Will it look exactly like the real thing?",
    a: "Results can vary depending on the photo you upload and the garment. Use it as a guide to how a piece could look on you, not as a guarantee of fit.",
  },
  {
    q: "What if it can't make my try-on?",
    a: "If the photo doesn't show a clear pose, or doesn't show the part of your body the garment covers, you'll be asked for a different photo. Facing the camera, upright, with your shoulders in frame works best.",
  },
  {
    q: "What can I try on?",
    a: "Clothing and shoes: tops, bottoms, full outfits and outerwear. Accessories such as bags, jewellery and eyewear aren't supported.",
  },
];

export const STORE_FAQ: Faq[] = [
  {
    q: "Which platforms does Clothsy work with?",
    a: "Shopify, as an app with a Try it on block for your product pages, and WooCommerce, as a plugin. Other platforms aren't supported today.",
  },
  {
    q: "How do I add the button?",
    a: "On Shopify, install the app, then add the Try it on block to your product template in the theme editor. On WooCommerce, install the plugin: the button appears below Add to cart automatically, or you can place it with a block or the [clothsy_ai_tryon] shortcode.",
  },
  {
    q: "Can I customise the button?",
    a: "Yes: the label, button colour, text colour and corner radius, plus where it sits. The font comes from your theme's button styles. The try-on window itself uses Clothsy's own design.",
  },
  {
    q: "Can I collect shoppers' emails?",
    a: "Yes, if you choose to. You can require an email before a try-on runs. On Shopify, leads appear with the product they tried and can be exported as a CSV.",
  },
  {
    q: "What does the analytics show?",
    a: "How often the widget is opened, emails captured, and try-ons completed and failed, over 7, 14 or 30 days, with a CSV export on Shopify. It does not track add-to-cart or sales.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. Basic is free with 15 try-ons a month. Paid plans run from $19.99 a month for 250 try-ons up to $199 a month for 4,250.",
  },
  {
    q: "What happens when we use up our try-ons?",
    a: "Your allowance is your limit, so there are no surprise charges. Shoppers see a message to check back next month, and you can move to a bigger plan whenever you like.",
  },
  {
    q: "Is there a developer API?",
    a: "Not today. If you need something custom, get in touch.",
  },
];

export const PRICING_FAQ: Faq[] = [
  STORE_FAQ[5],
  STORE_FAQ[6],
  {
    q: "Do failed try-ons use my allowance?",
    a: "No. If a try-on fails, the try-on is given back to your allowance.",
  },
  {
    q: "Can I change or cancel my plan?",
    a: "Any time. On Shopify, charges appear on your Shopify bill. On WooCommerce, upgrades start immediately with a full allowance, and downgrades or cancellations take effect at the end of the period you have paid for.",
  },
  {
    q: "Is yearly billing available?",
    a: "On Shopify, yes: yearly plans save about 20%. WooCommerce plans are billed monthly.",
  },
  {
    q: "Do you offer volume pricing?",
    a: "If you expect more than 4,250 try-ons a month, get in touch and we will talk it through.",
  },
];

/* ---------------- resources: real guides ---------------- */

export type GuideBlock = { type: "p"; text: string } | { type: "h"; text: string } | { type: "ul"; items: string[] };

export type Guide = {
  slug: string;
  audience: "Shoppers" | "Stores";
  title: string;
  summary: string;
  body: GuideBlock[];
};

export const GUIDES: Guide[] = [
  {
    slug: "take-a-photo-that-works",
    audience: "Shoppers",
    title: "Take a photo that works",
    summary: "What to check before you upload, so your try-on comes out well.",
    body: [
      { type: "p", text: "Clothsy places a garment on the person in your photo, so a clearer photo gives a better look." },
      { type: "h", text: "What works best" },
      {
        type: "ul",
        items: [
          "Just you in the shot, with your face fully visible.",
          "Stand upright, facing the camera.",
          "Fill most of the frame, with your shoulders down.",
          "Show the part of your body the garment covers: a top needs your upper body, trousers need your legs.",
          "Use a JPG or PNG up to 10 MB, at least 512 pixels on the long side.",
        ],
      },
      { type: "h", text: "If a try-on can't be made" },
      {
        type: "p",
        text: "If the photo doesn't show a clear pose, or doesn't show the part of your body the garment covers, you will be asked for a different photo. Try one that follows the tips above.",
      },
      { type: "p", text: "Results can vary depending on the photo you upload and the garment." },
    ],
  },
  {
    slug: "what-happens-to-your-photo",
    audience: "Shoppers",
    title: "What happens to your photo",
    summary: "Consent, storage and who can see what, in plain language.",
    body: [
      { type: "p", text: "This is a short summary. The full shopper privacy policy is linked at the bottom." },
      { type: "h", text: "Before anything is sent" },
      {
        type: "p",
        text: "Choosing a photo only shows it to you, inside your own browser. Nothing is sent until you tick the consent box and press Generate.",
      },
      { type: "h", text: "After you press Generate" },
      {
        type: "ul",
        items: [
          "Your photo goes to our AI image-processing provider to create the look. Neither they nor we use it to train AI models.",
          "FabricVTON never stores your photo or the try-on image.",
          "The store cannot see your photo or your result.",
        ],
      },
      { type: "h", text: "Emails and history" },
      {
        type: "p",
        text: "If the store asks for your email, it goes to that store as a marketing lead with the product you were viewing. We keep a record of each try-on (the product, the time and whether it worked). Your email is removed from that record after 90 days, and the rest is deleted after 13 months.",
      },
    ],
  },
  {
    slug: "add-clothsy-to-shopify",
    audience: "Stores",
    title: "Add Clothsy to your Shopify store",
    summary: "Install the app and put the Try it on button on your product pages.",
    body: [
      { type: "p", text: "Clothsy is a Shopify app with a theme block, so the button sits on your product pages without editing theme code." },
      { type: "h", text: "Set it up" },
      {
        type: "ul",
        items: [
          "Install the Clothsy AI app from the Shopify App Store.",
          "In your theme editor, open a product template and add the Try it on app block where you want the button.",
          "Save, then open a product page to check it.",
        ],
      },
      { type: "h", text: "Make it yours" },
      {
        type: "p",
        text: "On the block you can change the button label (Try It On by default), the button colour and text colour, and the corner radius, and choose whether shoppers must enter an email first. The font comes from your theme's button styles.",
      },
    ],
  },
  {
    slug: "add-clothsy-to-woocommerce",
    audience: "Stores",
    title: "Add Clothsy to WooCommerce",
    summary: "Install the plugin and choose where the button appears.",
    body: [
      { type: "p", text: "The plugin needs WordPress 6.5 or later, PHP 8.1 or later, and WooCommerce 8.5 or later." },
      { type: "h", text: "Where the button goes" },
      {
        type: "ul",
        items: [
          "By default it appears below Add to cart.",
          "Or place it yourself with the block or the [clothsy_ai_tryon] shortcode.",
        ],
      },
      { type: "h", text: "Settings" },
      {
        type: "ul",
        items: [
          "Button text, button colour and text colour, and corner radius (0 to 50 px).",
          "Whether to require an email before a try-on runs.",
          "Per product: turn try-on off, or set the garment type (top, bottom, full body, outerwear or shoes).",
        ],
      },
      { type: "p", text: "Grouped products are not supported." },
    ],
  },
  {
    slug: "plans-and-try-on-allowance",
    audience: "Stores",
    title: "Plans and your try-on allowance",
    summary: "How the monthly allowance works, and what happens at the limit.",
    body: [
      { type: "p", text: "Every store starts on Basic, which is free and includes 15 try-ons a month. Paid plans add more try-ons." },
      { type: "h", text: "The allowance is your limit" },
      {
        type: "p",
        text: "There are no surprise charges. When a store has used its try-ons for the month, shoppers see a message to check back next month, and you can move to a bigger plan whenever you like.",
      },
      { type: "h", text: "Failed try-ons" },
      { type: "p", text: "If a try-on fails, it is given back to your allowance." },
    ],
  },
];
