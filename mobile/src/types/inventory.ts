import { Product } from "@/types/product";
import { OrderStoreSummary } from "@/types/order";

export type ProductStoreInventory = {
  store: OrderStoreSummary & {
    type?: string;
  };
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  expiryDate?: string | null;
  lowStockThreshold: number;
};

export type ProductInventory = {
  product: Product;
  inventories: ProductStoreInventory[];
};

export type InventoryAlert = {
  type: "LOW_STOCK" | "EXPIRING_SOON" | "EXPIRED";
  severity: "WARNING" | "CRITICAL";
  message: string;
  inventoryId: string;
  store: OrderStoreSummary & {
    type?: string;
  };
  product: Product;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  lowStockThreshold: number;
  expiryDate?: string | null;
};

export type InventoryRequestUser = {
  _id: string;
  fullName: string;
  email?: string;
  phone?: string;
  role?: string;
};

export type InventoryRestockRequest = {
  _id: string;
  storeId: OrderStoreSummary & {
    type?: string;
  };
  productId: Product;
  requestedBy: InventoryRequestUser;
  handledBy?: InventoryRequestUser | null;
  currentAvailableStock: number;
  requestedQuantity: number;
  reason: string;
  status: "OPEN" | "RESOLVED" | "CANCELLED";
  managerNote?: string;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};
