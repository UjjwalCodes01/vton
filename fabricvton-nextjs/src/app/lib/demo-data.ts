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
    image: "/model_images/original/7.jpg",
    galleryImages: [
      "/model_images/original/7.jpg",
    ],
    demoTryOn: {
      userPhoto: "/model_images/original/7.jpg",
      resultPhoto: "/model_images/generated/7_generated.jpg",
    },
    tryOnExperience: {
      initialPersonImage: "/demo_tryon/product_1/person.png",
      garments: [
        {
          id: 1,
          label: "Garment 1",
          garmentImage: "/demo_tryon/product_1/1.png",
          resultImage: "/demo_tryon/product_1/output_garment_1_1.png",
        },
        {
          id: 2,
          label: "Garment 2",
          garmentImage: "/demo_tryon/product_1/2.png",
          resultImage: "/demo_tryon/product_1/output_garment_2_1.png",
        },
        {
          id: 3,
          label: "Garment 3",
          garmentImage: "/demo_tryon/product_1/3.png",
          resultImage: "/demo_tryon/product_1/output_garment_3_1.png",
        },
        {
          id: 4,
          label: "Garment 4",
          garmentImage: "/demo_tryon/product_1/4.png",
          resultImage: "/demo_tryon/product_1/output_garment_4_1.png",
        },
        {
          id: 5,
          label: "Garment 5",
          garmentImage: "/demo_tryon/product_1/5.png",
          resultImage: "/demo_tryon/product_1/output_garment_5_1.png",
        },
        {
          id: 6,
          label: "Garment 6",
          garmentImage: "/demo_tryon/product_1/6.png",
          resultImage: "/demo_tryon/product_1/output_garment_6_1.png",
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
    tryOnExperience: {
      initialPersonImage: "/demo_tryon/product_3/person.png",
      garments: [
        {
          id: 1,
          label: "Garment 1",
          garmentImage: "/demo_tryon/product_3/1.png",
          resultImage: "/demo_tryon/product_3/output_garment_1_1.png",
        },
        {
          id: 2,
          label: "Garment 2",
          garmentImage: "/demo_tryon/product_3/2.png",
          resultImage: "/demo_tryon/product_3/output_garment_2_1.png",
        },
        {
          id: 3,
          label: "Garment 3",
          garmentImage: "/demo_tryon/product_3/3.png",
          resultImage: "/demo_tryon/product_3/output_garment_3_1.png",
        },
        {
          id: 4,
          label: "Garment 4",
          garmentImage: "/demo_tryon/product_3/4.png",
          resultImage: "/demo_tryon/product_3/output_garment_4_1.png",
        },
        {
          id: 5,
          label: "Garment 5",
          garmentImage: "/demo_tryon/product_3/5.png",
          resultImage: "/demo_tryon/product_3/output_garment_5_1.png",
        },
        {
          id: 6,
          label: "Garment 6",
          garmentImage: "/demo_tryon/product_3/6.png",
          resultImage: "/demo_tryon/product_3/output_garment_6_1.png",
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
    image: "/model_images/original/6.jpg",
    galleryImages: [
      "/model_images/original/6.jpg",
    ],
    demoTryOn: {
      userPhoto: "/model_images/original/6.jpg",
      resultPhoto: "/model_images/generated/6_generated.jpg",
    },
    tryOnExperience: {
      initialPersonImage: "/demo_tryon/product_4/person.png",
      garments: [
        {
          id: 1,
          label: "Garment 1",
          garmentImage: "/demo_tryon/product_4/1.png",
          resultImage: "/demo_tryon/product_4/output_garment_1_1.png",
        },
        {
          id: 2,
          label: "Garment 2",
          garmentImage: "/demo_tryon/product_4/2.png",
          resultImage: "/demo_tryon/product_4/output_garment_2_1.png",
        },
        {
          id: 3,
          label: "Garment 3",
          garmentImage: "/demo_tryon/product_4/3.png",
          resultImage: "/demo_tryon/product_4/output_garment_3_1.png",
        },
        {
          id: 4,
          label: "Garment 4",
          garmentImage: "/demo_tryon/product_4/4.png",
          resultImage: "/demo_tryon/product_4/output_garment_4_1.png",
        },
        {
          id: 5,
          label: "Garment 5",
          garmentImage: "/demo_tryon/product_4/5.png",
          resultImage: "/demo_tryon/product_4/output_garment_5_1.png",
        },
        {
          id: 6,
          label: "Garment 6",
          garmentImage: "/demo_tryon/product_4/6.png",
          resultImage: "/demo_tryon/product_4/output_garment_6_1.png",
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
