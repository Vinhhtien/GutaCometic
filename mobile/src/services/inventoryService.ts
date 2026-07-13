import { apiRequest } from "@/services/api";
import {
  InventoryAlert,
  InventoryAdjustment,
  InventoryAdjustmentType,
  IncomingStockTransfer,
  InventoryReceipt,
  InventoryRestockRequest,
  ProductInventory,
} from "@/types/inventory";

export type InventoryFilters = {
  brand?: string;
  category?: string;
  limit?: number;
  productIds?: string[];
  search?: string;
  skinType?: string;
};

export const getProductInventory = async (
  token: string,
  filters: InventoryFilters = {}
) => {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.brand) {
    params.set("brand", filters.brand);
  }

  if (filters.skinType) {
    params.set("skinType", filters.skinType);
  }

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }

  if (filters.productIds?.length) {
    params.set("productIds", filters.productIds.join(","));
  }

  const query = params.toString();
  const response = await apiRequest<{ products: ProductInventory[] }>(
    `/inventory/products${query ? `?${query}` : ""}`,
    { token }
  );

  return response.products;
};

export const getInventoryAlerts = async (token: string, storeId?: string) => {
  const query = storeId ? `?storeId=${storeId}` : "";
  const response = await apiRequest<{ alerts: InventoryAlert[] }>(
    `/inventory/alerts${query}`,
    { token }
  );

  return response.alerts;
};

export const getRestockRequests = async (
  token: string,
  status: "OPEN" | "RESOLVED" | "CANCELLED" | "ALL" = "OPEN"
) => {
  const response = await apiRequest<{ requests: InventoryRestockRequest[] }>(
    `/inventory/restock-requests?status=${status}`,
    { token }
  );

  return response.requests;
};

export const createRestockRequest = async (
  token: string,
  payload: {
    productId: string;
    reason?: string;
    requestedQuantity: number;
    storeId?: string;
  }
) => {
  const response = await apiRequest<{ request: InventoryRestockRequest }>(
    "/inventory/restock-requests",
    {
      body: payload,
      method: "POST",
      token,
    }
  );

  return response.request;
};

export const updateRestockRequestStatus = async (
  token: string,
  requestId: string,
  payload: {
    managerNote?: string;
    status: "RESOLVED" | "CANCELLED";
  }
) => {
  const response = await apiRequest<{ request: InventoryRestockRequest }>(
    `/inventory/restock-requests/${requestId}`,
    {
      body: payload,
      method: "PATCH",
      token,
    }
  );

  return response.request;
};

export const acknowledgeRestockRequest = async (
  token: string,
  requestId: string
) => {
  const response = await apiRequest<{ request: InventoryRestockRequest }>(
    `/inventory/restock-requests/${requestId}/acknowledge`,
    {
      method: "POST",
      token,
    }
  );

  return response.request;
};

export const receiveRestockRequest = async (
  token: string,
  requestId: string,
  payload: {
    managerNote?: string;
    receivedQuantity: number;
  }
) => {
  const response = await apiRequest<{ request: InventoryRestockRequest }>(
    `/inventory/restock-requests/${requestId}/receive`,
    {
      body: payload,
      method: "POST",
      token,
    }
  );

  return response.request;
};

export const receiveDirectStock = async (
  token: string,
  payload: {
    note?: string;
    productId: string;
    quantity: number;
    storeId?: string;
  }
) => {
  const response = await apiRequest<{
    receipt: {
      inventory: unknown;
      note: string;
      receivedQuantity: number;
    };
  }>("/inventory/receipts", {
    body: payload,
    method: "POST",
    token,
  });

  return response.receipt;
};

export const getInventoryReceipts = async (token: string, storeId?: string) => {
  const query = storeId ? `?storeId=${storeId}` : "";
  const response = await apiRequest<{ receipts: InventoryReceipt[] }>(
    `/inventory/receipts${query}`,
    { token }
  );

  return response.receipts;
};

export const getInventoryAdjustments = async (
  token: string,
  storeId?: string
) => {
  const query = storeId ? `?storeId=${storeId}` : "";
  const response = await apiRequest<{ adjustments: InventoryAdjustment[] }>(
    `/inventory/adjustments${query}`,
    { token }
  );

  return response.adjustments;
};

export const createInventoryAdjustment = async (
  token: string,
  payload: {
    note?: string;
    productId: string;
    quantity: number;
    storeId?: string;
    type: InventoryAdjustmentType;
  }
) => {
  const response = await apiRequest<{ adjustment: InventoryAdjustment }>(
    "/inventory/adjustments",
    {
      body: payload,
      method: "POST",
      token,
    }
  );

  return response.adjustment;
};

export const getIncomingTransfers = async (token: string, storeId?: string) => {
  const query = storeId ? `?storeId=${storeId}` : "";
  const response = await apiRequest<{ transfers: IncomingStockTransfer[] }>(
    `/inventory/transfers/incoming${query}`,
    { token }
  );

  return response.transfers;
};

export const confirmIncomingTransfer = async (
  token: string,
  transferId: string
) => {
  const response = await apiRequest<{ transfer: IncomingStockTransfer }>(
    `/inventory/transfers/${transferId}/confirm`,
    {
      method: "POST",
      token,
    }
  );

  return response.transfer;
};
