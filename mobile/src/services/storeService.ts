import { apiRequest } from "@/services/api";
import { Store } from "@/types/store";

export const getStores = async (token: string) => {
  const response = await apiRequest<{ stores: Store[] }>("/stores", {
    token,
  });

  return response.stores;
};
