import { apiRequest } from "@/services/api";
import {
  CreateOnlineOrderPayload,
  CreateOnlineOrderResponse,
  Order,
} from "@/types/order";

export const createOnlineOrder = async (
  token: string,
  payload: CreateOnlineOrderPayload
) => {
  return apiRequest<CreateOnlineOrderResponse>("/orders/online", {
    token,
    method: "POST",
    body: payload,
  });
};

export const getOrders = async (
  token: string,
  status?: string,
  paymentStatus?: string
) => {
  const params = new URLSearchParams();

  if (status) {
    params.set("status", status);
  }

  if (paymentStatus) {
    params.set("paymentStatus", paymentStatus);
  }

  const query = params.toString() ? `?${params.toString()}` : "";
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

export const syncPayosPaymentStatus = async (
  token: string,
  orderId: string
) => {
  return apiRequest<{ order: Order; payosStatus: string }>(
    `/payments/payos/orders/${orderId}/sync`,
    {
      token,
      method: "POST",
    }
  );
};

export const getPayosPaymentLink = async (token: string, orderId: string) => {
  const response = await apiRequest<{
    payment: CreateOnlineOrderResponse["payment"];
  }>(`/payments/payos/orders/${orderId}/link`, {
    token,
  });

  return response.payment;
};
