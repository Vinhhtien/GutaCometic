export type ProductIngredient = {
  icon: string;
  title: string;
  subtitle: string;
};

export type Product = {
  _id: string;
  sku: string;
  name: string;
  brand: string;
  description: string;
  image: string;
  images?: string[];
  price: number;
  originalPrice?: number | null;
  category: string;
  skinTypes: string[];
  volume?: string;
  origin?: string;
  expiryDate?: string;
  ingredients?: ProductIngredient[];
  rating?: number;
  reviewCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
