export type Product = {
  id: number;
  name: string;
  brand: string;
  price: number;
  originalPrice: number | null;
  rating: number;
  reviews: number;
  badge: string | null;
  image: string;
  galleryImages: string[];
  demoTryOn: {
    userPhoto: string;
    resultPhoto: string;
  };
  colors: string[];
  sizes: string[];
  description: string;
  material: string;
  fit: string;
};

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Classic Cotton T-Shirt",
    brand: "Thread & Co. Basics",
    price: 35,
    originalPrice: 45,
    rating: 4.8,
    reviews: 1241,
    badge: "Bestseller",
    image: "/model_images/original/7.jpg",
    galleryImages: [
      "/model_images/original/7.jpg",
    ],
    demoTryOn: {
      userPhoto: "/model_images/original/7.jpg",
      resultPhoto: "/model_images/generated/7_generated.jpg",
    },
    colors: ["#ffffff", "#1c1c1c", "#f5f0e8"],
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "A timeless cotton t-shirt crafted from premium fabrics. Perfect for layering or wearing on its own.",
    material: "100% Organic Cotton",
    fit: "Regular",
  },
  {
    id: 2,
    name: "Knitted Summer Polo",
    brand: "Thread & Co. Studio",
    price: 79,
    originalPrice: null,
    rating: 4.9,
    reviews: 891,
    badge: "New",
    image: "/model_images/original/9.jpg",
    galleryImages: [
      "/model_images/original/9.jpg",
    ],
    demoTryOn: {
      userPhoto: "/model_images/original/9.jpg",
      resultPhoto: "/model_images/generated/9_generated.jpg",
    },
    colors: ["#8b7355", "#1c1c1c", "#f5f0e8"],
    sizes: ["S", "M", "L", "XL"],
    description: "A breathable, lightweight knitted polo. Ideal for warm weather and smart-casual occasions.",
    material: "80% Cotton, 20% Silk",
    fit: "Slim",
  },
  {
    id: 3,
    name: "Minimalist Crewneck Sweater",
    brand: "Thread & Co. Essentials",
    price: 110,
    originalPrice: 140,
    rating: 4.7,
    reviews: 543,
    badge: "-21% Off",
    image: "/model_images/original/2.jpeg",
    galleryImages: [
      "/model_images/original/2.jpeg",
    ],
    demoTryOn: {
      userPhoto: "/model_images/original/2.jpeg",
      resultPhoto: "/model_images/generated/2_generated.jpg",
    },
    colors: ["#1c1c1c", "#6b7280", "#d1d5db"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    description: "A versatile crewneck sweater that perfectly balances warmth and weight. A wardrobe staple.",
    material: "100% Merino Wool",
    fit: "Relaxed",
  },
  {
    id: 4,
    name: "Modern Urban Jacket",
    brand: "Thread & Co. Outerwear",
    price: 189,
    originalPrice: null,
    rating: 4.9,
    reviews: 312,
    badge: "Top Rated",
    image: "/model_images/original/8.jpg",
    galleryImages: [
      "/model_images/original/8.jpg",
    ],
    demoTryOn: {
      userPhoto: "/model_images/original/8.jpg",
      resultPhoto: "/model_images/generated/8_generated.jpg",
    },
    colors: ["#2c3e50", "#1c1c1c", "#8b7355"],
    sizes: ["S", "M", "L", "XL"],
    description: "Sleek and highly functional. This jacket provides excellent wind resistance while maintaining a sharp silhouette.",
    material: "100% Technical Polyester",
    fit: "Slim",
  },
  {
    id: 5,
    name: "Casual Linen Button-Up",
    brand: "Thread & Co. Summer",
    price: 85,
    originalPrice: 115,
    rating: 4.6,
    reviews: 967,
    badge: null,
    image: "/model_images/original/12.jpg",
    galleryImages: [
      "/model_images/original/12.jpg",
    ],
    demoTryOn: {
      userPhoto: "/model_images/original/12.jpg",
      resultPhoto: "/model_images/generated/12_generated.jpg",
    },
    colors: ["#d4c5b0", "#ffffff", "#8b7355"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    description: "Woven from premium French linen, this relaxed-fit shirt breathes beautifully in warm weather.",
    material: "100% French Linen",
    fit: "Relaxed",
  },
  {
    id: 6,
    name: "Everyday Denim Over-Shirt",
    brand: "Thread & Co. Raw",
    price: 125,
    originalPrice: null,
    rating: 4.8,
    reviews: 421,
    badge: "Trending",
    image: "/model_images/original/6.jpg",
    galleryImages: [
      "/model_images/original/6.jpg",
    ],
    demoTryOn: {
      userPhoto: "/model_images/original/6.jpg",
      resultPhoto: "/model_images/generated/6_generated.jpg",
    },
    colors: ["#5b7fa6", "#1c1c1c"],
    sizes: ["S", "M", "L", "XL"],
    description: "A durable yet soft denim over-shirt. Easily layers over t-shirts or light sweaters.",
    material: "100% Cotton Denim",
    fit: "Regular",
  },
];
