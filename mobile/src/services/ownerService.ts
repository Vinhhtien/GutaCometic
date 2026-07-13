import { apiRequest } from "@/services/api";
import {
  ManagedStaff,
  ManagedStore,
  OwnerProduct,
  OwnerProductPayload,
  OwnerStaffPayload,
  OwnerStorePayload,
  OwnerTransfer,
  OwnerTransferPayload,
} from "@/types/owner";

export const getOwnerProducts = async (
  token: string,
  filters: {
    category?: string;
    includeInactive?: boolean;
    search?: string;
  } = {}
) => {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.includeInactive !== undefined) {
    params.set("includeInactive", String(filters.includeInactive));
  }

  const query = params.toString();
  const response = await apiRequest<{ products: OwnerProduct[] }>(
    `/owner/products${query ? `?${query}` : ""}`,
    { token }
  );

  return response.products;
};

export const createOwnerProduct = async (
  token: string,
  payload: OwnerProductPayload
) => {
  const response = await apiRequest<{ product: OwnerProduct }>("/owner/products", {
    body: payload,
    method: "POST",
    token,
  });

  return response.product;
};

export const updateOwnerProduct = async (
  token: string,
  productId: string,
  payload: Partial<OwnerProductPayload>
) => {
  const response = await apiRequest<{ product: OwnerProduct }>(
    `/owner/products/${productId}`,
    {
      body: payload,
      method: "PATCH",
      token,
    }
  );

  return response.product;
};

export const getOwnerStores = async (
  token: string,
  includeInactive = true
) => {
  const response = await apiRequest<{ stores: ManagedStore[] }>(
    `/owner/stores?includeInactive=${includeInactive}`,
    { token }
  );

  return response.stores;
};

export const createOwnerStore = async (
  token: string,
  payload: OwnerStorePayload
) => {
  const response = await apiRequest<{ store: ManagedStore }>("/owner/stores", {
    body: payload,
    method: "POST",
    token,
  });

  return response.store;
};

export const updateOwnerStore = async (
  token: string,
  storeId: string,
  payload: Partial<OwnerStorePayload>
) => {
  const response = await apiRequest<{ store: ManagedStore }>(
    `/owner/stores/${storeId}`,
    {
      body: payload,
      method: "PATCH",
      token,
    }
  );

  return response.store;
};

export const getOwnerStaff = async (
  token: string,
  includeInactive = true
) => {
  const response = await apiRequest<{ staff: ManagedStaff[] }>(
    `/owner/staff?includeInactive=${includeInactive}`,
    { token }
  );

  return response.staff;
};

export const createOwnerStaff = async (
  token: string,
  payload: OwnerStaffPayload
) => {
  const response = await apiRequest<{ staff: ManagedStaff }>("/owner/staff", {
    body: payload,
    method: "POST",
    token,
  });

  return response.staff;
};

export const updateOwnerStaff = async (
  token: string,
  userId: string,
  payload: Partial<OwnerStaffPayload>
) => {
  const response = await apiRequest<{ staff: ManagedStaff }>(
    `/owner/staff/${userId}`,
    {
      body: payload,
      method: "PATCH",
      token,
    }
  );

  return response.staff;
};

export const getOwnerTransfers = async (
  token: string,
  filters: {
    status?: "ALL" | "PENDING" | "CONFIRMED" | "CANCELLED";
    storeId?: string;
  } = {}
) => {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.storeId) {
    params.set("storeId", filters.storeId);
  }

  const query = params.toString();
  const response = await apiRequest<{ transfers: OwnerTransfer[] }>(
    `/owner/transfers${query ? `?${query}` : ""}`,
    { token }
  );

  return response.transfers;
};

export const createOwnerTransfer = async (
  token: string,
  payload: OwnerTransferPayload
) => {
  const response = await apiRequest<{ transfer: OwnerTransfer }>("/owner/transfers", {
    body: payload,
    method: "POST",
    token,
  });

  return response.transfer;
};

export const cancelOwnerTransfer = async (
  token: string,
  transferId: string
) => {
  const response = await apiRequest<{ transfer: OwnerTransfer }>(
    `/owner/transfers/${transferId}/cancel`,
    {
      method: "PATCH",
      token,
    }
  );

  return response.transfer;
};
