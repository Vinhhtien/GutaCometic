import { apiRequest } from "@/services/api";
import { Product } from "@/types/product";

type ProductsResponse = {
  products: Product[];
};

export type ProductFilters = {
  search?: string;
  skinType?: string;
  category?: string;
};

export const getProducts = async (
  token: string,
  filters: ProductFilters = {}
) => {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.skinType) {
    params.set("skinType", filters.skinType);
  }

  if (filters.category) {
    params.set("category", filters.category);
  }

  const query = params.toString();
  const response = await apiRequest<ProductsResponse>(
    `/products${query ? `?${query}` : ""}`,
    { token }
  );

  return response.products;
};

export const getProductById = async (token: string, id: string) => {
  const response = await apiRequest<{ product: Product }>(`/products/${id}`, {
    token,
  });

  return response.product;
};
