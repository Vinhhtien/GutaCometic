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

export const getOrders = async (token: string, status?: string) => {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await apiRequest<{ orders: Order[] }>(`/orders${query}`, {
    token,
  });

  return response.orders;
};

export const getOrderById = async (token: string, orderId: string) => {
  const response = await apiRequest<{ order: Order }>(`/orders/${orderId}`, {
    token,
  });

  return response.order;
};

export const cancelOrder = async (
  token: string,
  orderId: string,
  reason?: string
) => {
  const response = await apiRequest<{ order: Order }>(
    `/orders/${orderId}/cancel`,
    {
      token,
      method: "PATCH",
      body: reason ? { reason } : undefined,
    }
  );

  return response.order;
};
