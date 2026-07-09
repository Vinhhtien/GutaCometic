import { apiRequest } from "@/services/api";
import {
  InventoryAlert,
  InventoryRestockRequest,
  ProductInventory,
} from "@/types/inventory";

export type InventoryFilters = {
  brand?: string;
  category?: string;
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

  const query = params.toString();
  const response = await apiRequest<{ products: ProductInventory[] }>(
    `/inventory/products${query ? `?${query}` : ""}`,
    { token }
  );

  return response.products;
};

export const getInventoryAlerts = async (token: string) => {
  const response = await apiRequest<{ alerts: InventoryAlert[] }>(
    "/inventory/alerts",
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
