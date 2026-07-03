import { apiRequest } from "@/services/api";
import { Review } from "@/types/review";

export const getProductReviews = async (
  token: string,
  productId: string,
  limit?: number
) => {
  const params = new URLSearchParams({ productId });

  if (limit) {
    params.set("limit", String(limit));
  }

  const response = await apiRequest<{ reviews: Review[] }>(
    `/reviews?${params.toString()}`,
    { token }
  );

  return response.reviews;
};
