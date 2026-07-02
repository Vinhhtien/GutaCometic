import { apiRequest } from "@/services/api";
import { Product } from "@/types/product";
import { ToggleWishlistResult } from "@/types/wishlist";

export const getWishlist = async (token: string) => {
  const response = await apiRequest<{ products: Product[] }>("/wishlist", {
    token,
  });

  return response.products;
};

export const toggleWishlist = async (token: string, productId: string) =>
  apiRequest<ToggleWishlistResult>("/wishlist/toggle", {
    token,
    method: "POST",
    body: { productId },
  });
