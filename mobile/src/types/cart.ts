import { Product } from "@/types/product";

export type CartItem = {
  productId: string;
  sku: string;
  name: string;
  brand: string;
  image: string;
  unitPrice: number;
  quantity: number;
};

export type AddToCartInput = {
  product: Product;
  quantity?: number;
};
