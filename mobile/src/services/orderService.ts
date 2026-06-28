import { apiRequest } from "@/services/api";
import { CreateOnlineOrderPayload, Order } from "@/types/order";

export const createOnlineOrder = async (
  token: string,
  payload: CreateOnlineOrderPayload
) => {
  const response = await apiRequest<{ order: Order }>("/orders/online", {
    token,
    method: "POST",
    body: payload,
  });

  return response.order;
};
