import { apiRequest } from "@/services/api";
import { Product } from "@/types/product";

type ProductsResponse = {
  products: Product[];
};

export const getProducts = async (token: string) => {
  const response = await apiRequest<ProductsResponse>("/products", { token });
  return response.products;
};
