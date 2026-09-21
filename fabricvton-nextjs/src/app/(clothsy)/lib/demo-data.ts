export type ProductTryOnGarment = {
  id: number;
  label: string;
  garmentImage: string;
  resultImage: string;
};

export type ProductTryOnExperience = {
  initialPersonImage: string;
  garments: ProductTryOnGarment[];
};

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
  tryOnExperience?: ProductTryOnExperience;
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
    image: "/web/model_images/original/7.webp",
    galleryImages: [
      "/web/model_images/original/7.webp",
    ],
    demoTryOn: {
      userPhoto: "/web/model_images/original/7.webp",
      resultPhoto: "/web/model_images/generated/7_generated.webp",
    },
    tryOnExperience: {
      initialPersonImage: "/web/demo_tryon/product_1/person.webp",
      garments: [
        {
          id: 1,
          label: "Garment 1",
          garmentImage: "/web/demo_tryon/product_1/1.webp",
          resultImage: "/web/demo_tryon/product_1/output_garment_1_1.webp",
        },
        {
          id: 2,
          label: "Garment 2",
          garmentImage: "/web/demo_tryon/product_1/2.webp",
          resultImage: "/web/demo_tryon/product_1/output_garment_2_1.webp",
        },
        {
          id: 3,
          label: "Garment 3",
          garmentImage: "/web/demo_tryon/product_1/3.webp",
          resultImage: "/web/demo_tryon/product_1/output_garment_3_1.webp",
        },
        {
          id: 4,
          label: "Garment 4",
          garmentImage: "/web/demo_tryon/product_1/4.webp",
          resultImage: "/web/demo_tryon/product_1/output_garment_4_1.webp",
        },
        {
          id: 5,
          label: "Garment 5",
          garmentImage: "/web/demo_tryon/product_1/5.webp",
          resultImage: "/web/demo_tryon/product_1/output_garment_5_1.webp",
        },
        {
          id: 6,
          label: "Garment 6",
          garmentImage: "/web/demo_tryon/product_1/6.webp",
          resultImage: "/web/demo_tryon/product_1/output_garment_6_1.webp",
        },
      ],
    },
    colors: ["#ffffff", "#1c1c1c", "#f5f0e8"],
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "A timeless cotton t-shirt crafted from premium fabrics. Perfect for layering or wearing on its own.",
    material: "100% Organic Cotton",
    fit: "Regular",
  },
  {
    id: 3,
    name: "Casual Linen Button-Up",
    brand: "Thread & Co. Summer",
    price: 85,
    originalPrice: 115,
    rating: 4.6,
    reviews: 967,
    badge: null,
    image: "/web/model_images/original/12.webp",
    galleryImages: [
      "/web/model_images/original/12.webp",
    ],
    demoTryOn: {
      userPhoto: "/web/model_images/original/12.webp",
      resultPhoto: "/web/model_images/generated/12_generated.webp",
    },
    tryOnExperience: {
      initialPersonImage: "/web/demo_tryon/product_3/person.webp",
      garments: [
        {
          id: 1,
          label: "Garment 1",
          garmentImage: "/web/demo_tryon/product_3/1.webp",
          resultImage: "/web/demo_tryon/product_3/output_garment_1_1.webp",
        },
        {
          id: 2,
          label: "Garment 2",
          garmentImage: "/web/demo_tryon/product_3/2.webp",
          resultImage: "/web/demo_tryon/product_3/output_garment_2_1.webp",
        },
        {
          id: 3,
          label: "Garment 3",
          garmentImage: "/web/demo_tryon/product_3/3.webp",
          resultImage: "/web/demo_tryon/product_3/output_garment_3_1.webp",
        },
        {
          id: 4,
          label: "Garment 4",
          garmentImage: "/web/demo_tryon/product_3/4.webp",
          resultImage: "/web/demo_tryon/product_3/output_garment_4_1.webp",
        },
        {
          id: 5,
          label: "Garment 5",
          garmentImage: "/web/demo_tryon/product_3/5.webp",
          resultImage: "/web/demo_tryon/product_3/output_garment_5_1.webp",
        },
        {
          id: 6,
          label: "Garment 6",
          garmentImage: "/web/demo_tryon/product_3/6.webp",
          resultImage: "/web/demo_tryon/product_3/output_garment_6_1.webp",
        },
      ],
    },
    colors: ["#d4c5b0", "#ffffff", "#8b7355"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    description: "Woven from premium French linen, this relaxed-fit shirt breathes beautifully in warm weather.",
    material: "100% French Linen",
    fit: "Relaxed",
  },
  {
    id: 4,
    name: "Everyday Denim Over-Shirt",
    brand: "Thread & Co. Raw",
    price: 125,
    originalPrice: null,
    rating: 4.8,
    reviews: 421,
    badge: "Trending",
    image: "/web/model_images/original/6.webp",
    galleryImages: [
      "/web/model_images/original/6.webp",
    ],
    demoTryOn: {
      userPhoto: "/web/model_images/original/6.webp",
      resultPhoto: "/web/model_images/generated/6_generated.webp",
    },
    tryOnExperience: {
      initialPersonImage: "/web/demo_tryon/product_4/person.webp",
      garments: [
        {
          id: 1,
          label: "Garment 1",
          garmentImage: "/web/demo_tryon/product_4/1.webp",
          resultImage: "/web/demo_tryon/product_4/output_garment_1_1.webp",
        },
        {
          id: 2,
          label: "Garment 2",
          garmentImage: "/web/demo_tryon/product_4/2.webp",
          resultImage: "/web/demo_tryon/product_4/output_garment_2_1.webp",
        },
        {
          id: 3,
          label: "Garment 3",
          garmentImage: "/web/demo_tryon/product_4/3.webp",
          resultImage: "/web/demo_tryon/product_4/output_garment_3_1.webp",
        },
        {
          id: 4,
          label: "Garment 4",
          garmentImage: "/web/demo_tryon/product_4/4.webp",
          resultImage: "/web/demo_tryon/product_4/output_garment_4_1.webp",
        },
        {
          id: 5,
          label: "Garment 5",
          garmentImage: "/web/demo_tryon/product_4/5.webp",
          resultImage: "/web/demo_tryon/product_4/output_garment_5_1.webp",
        },
        {
          id: 6,
          label: "Garment 6",
          garmentImage: "/web/demo_tryon/product_4/6.webp",
          resultImage: "/web/demo_tryon/product_4/output_garment_6_1.webp",
        },
      ],
    },
    colors: ["#5b7fa6", "#1c1c1c"],
    sizes: ["S", "M", "L", "XL"],
    description: "A durable yet soft denim over-shirt. Easily layers over t-shirts or light sweaters.",
    material: "100% Cotton Denim",
    fit: "Regular",
  },
];
