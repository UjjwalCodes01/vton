/* ── Models for Try-On Gallery ── */
export const MODELS = [
  { id: "m1", name: "Alex", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80" },
  { id: "m2", name: "Jordan", image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=500&q=80" },
  { id: "m3", name: "Sam", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&q=80" },
  { id: "m4", name: "Taylor", image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&q=80" },
];

export type Product = {
  id: number;
  name: string;
  brand: string;
  price: number;
  originalPrice: number | null;
  rating: number;
  reviews: number;
  badge: string;
  image: string;
  galleryImages: string[];
  tryOnResults: Record<string, string>; // Maps model ID to result image
  colors: string[];
  sizes: string[];
  description: string;
  material: string;
  fit: string;
};

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Classic White Oxford Shirt",
    brand: "Thread & Co. Basics",
    price: 89,
    originalPrice: 129,
    rating: 4.8,
    reviews: 2341,
    badge: "Bestseller",
    image: "https://images.unsplash.com/photo-1602810316498-ab67cf68c8e1?w=560&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1602810316498-ab67cf68c8e1?w=800&q=85",
      "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=85",
      "https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?w=800&q=85",
    ],
    tryOnResults: {
      "m1": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=640&q=85",
      "m2": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=640&q=85",
      "m3": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=640&q=85",
      "m4": "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=640&q=85",
    },
    colors: ["#ffffff", "#f5f0e8", "#d1d5db"],
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "A timeless oxford weave shirt crafted from 100% premium Egyptian cotton. Regular fit, button-down collar, and mother-of-pearl buttons. Perfect for any occasion.",
    material: "100% Egyptian Cotton",
    fit: "Regular",
  },
  {
    id: 2,
    name: "Midnight Navy Blazer",
    brand: "Thread & Co. Studio",
    price: 249,
    originalPrice: null,
    rating: 4.9,
    reviews: 891,
    badge: "New",
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4b4769?w=560&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1594938298603-c8148c4b4769?w=800&q=85",
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=85",
      "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=800&q=85",
    ],
    tryOnResults: {
      "m1": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=640&q=85",
      "m2": "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=640&q=85",
      "m3": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=640&q=85",
      "m4": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=640&q=85",
    },
    colors: ["#1e3a5f", "#1c1c1c", "#6b7280"],
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "Impeccably tailored from a fine Italian wool blend. Slim lapels, structured shoulders, and a clean back vent — the cornerstone of a modern wardrobe.",
    material: "80% Wool, 20% Polyester",
    fit: "Slim",
  },
  {
    id: 3,
    name: "Vintage Wash Denim Jacket",
    brand: "Thread & Co. Raw",
    price: 179,
    originalPrice: 220,
    rating: 4.7,
    reviews: 1543,
    badge: "-19% Off",
    image: "https://images.unsplash.com/photo-1601333144130-8cbb312386b6?w=560&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1601333144130-8cbb312386b6?w=800&q=85",
      "https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?w=800&q=85",
      "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&q=85",
    ],
    tryOnResults: {
      "m1": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=640&q=85",
      "m2": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=640&q=85",
      "m3": "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=640&q=85",
      "m4": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=640&q=85",
    },
    colors: ["#5b7fa6", "#2c3e50", "#8b7355"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    description: "Pre-washed for the perfect lived-in look. Classic trucker silhouette with brass buttons and heavyweight 12oz denim for a premium feel.",
    material: "100% Raw Denim",
    fit: "Relaxed",
  },
  {
    id: 4,
    name: "Minimal Black Turtleneck",
    brand: "Thread & Co. Essentials",
    price: 129,
    originalPrice: null,
    rating: 4.9,
    reviews: 3102,
    badge: "Top Rated",
    image: "https://images.unsplash.com/photo-1551489186-cf8726f514f8?w=560&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1551489186-cf8726f514f8?w=800&q=85",
      "https://images.unsplash.com/photo-1578587018452-892bace94f12?w=800&q=85",
      "https://images.unsplash.com/photo-1612469009265-4f4a3875323d?w=800&q=85",
    ],
    tryOnResults: {
      "m1": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=640&q=85",
      "m2": "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=640&q=85",
      "m3": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=640&q=85",
      "m4": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=640&q=85",
    },
    colors: ["#1c1c1c", "#f5f0e8", "#6b7280"],
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "Ultra-soft merino wool turtleneck designed for those who appreciate the power of simplicity. Ribbed cuffs and a perfectly weighted knit that holds its shape through seasons.",
    material: "100% Merino Wool",
    fit: "Slim",
  },
  {
    id: 5,
    name: "Earth Tone Linen Shirt",
    brand: "Thread & Co. Summer",
    price: 99,
    originalPrice: 130,
    rating: 4.6,
    reviews: 967,
    badge: "-24% Off",
    image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=560&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&q=85",
      "https://images.unsplash.com/photo-1588041071257-2c5e5fb272f3?w=800&q=85",
      "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&q=85",
    ],
    tryOnResults: {
      "m1": "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=640&q=85",
      "m2": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=640&q=85",
      "m3": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=640&q=85",
      "m4": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=640&q=85",
    },
    colors: ["#c4a882", "#8b7355", "#d4c5b0"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    description: "Woven from premium French linen, this relaxed-fit shirt breathes beautifully in warm weather. Camp collar, contrast stitching, and coconut shell buttons.",
    material: "100% French Linen",
    fit: "Relaxed",
  },
];
