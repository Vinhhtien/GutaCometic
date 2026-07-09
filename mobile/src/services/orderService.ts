import { apiRequest } from "@/services/api";
import {
  CreateOfflineOrderPayload,
  CreateOnlineOrderPayload,
  CreateOnlineOrderResponse,
  Order,
  PaymentLink,
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

export const createOfflineOrder = async (
  token: string,
  payload: CreateOfflineOrderPayload
) => {
  const response = await apiRequest<{ order: Order }>("/orders/offline", {
    token,
    method: "POST",
    body: payload,
  });

  return response.order;
};

export const getOrders = async (
  token: string,
  status?: string,
  paymentStatus?: string,
  channel?: string
) => {
  const params = new URLSearchParams();

  if (status) {
    params.set("status", status);
  }

  if (paymentStatus) {
    params.set("paymentStatus", paymentStatus);
  }

  if (channel) {
    params.set("channel", channel);
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

export const updateOnlineOrderStatus = async (
  token: string,
  orderId: string,
  status: string
) => {
  const response = await apiRequest<{ order: Order }>(
    `/orders/${orderId}/online-status`,
    {
      token,
      method: "PATCH",
      body: { status },
    }
  );

  return response.order;
};

export const approveOfflineOrder = async (token: string, orderId: string) => {
  const response = await apiRequest<{ order: Order }>(
    `/orders/${orderId}/approve`,
    {
      token,
      method: "PATCH",
    }
  );

  return response.order;
};

export const payOfflineOrder = async (
  token: string,
  orderId: string,
  paymentMethod: "CASH" | "CARD" | "BANK_TRANSFER"
) => {
  const response = await apiRequest<{ order: Order }>(`/orders/${orderId}/pay`, {
    token,
    method: "PATCH",
    body: { paymentMethod },
  });

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

export const createPosPayosPaymentLink = async (
  token: string,
  orderId: string
) => {
  const response = await apiRequest<{ payment: PaymentLink }>(
    `/payments/payos/pos-orders/${orderId}/create-link`,
    {
      token,
      method: "POST",
    }
  );

  return response.payment;
};

export const syncPosPayosPaymentStatus = async (
  token: string,
  orderId: string
) => {
  return apiRequest<{ order: Order; payosStatus: string }>(
    `/payments/payos/pos-orders/${orderId}/sync`,
    {
      token,
      method: "POST",
    }
  );
};
