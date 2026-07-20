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
  acknowledgedBy?: InventoryRequestUser | null;
  currentAvailableStock: number;
  requestedQuantity: number;
  reason: string;
  status: "OPEN" | "RESOLVED" | "CANCELLED";
  managerNote?: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InventoryAdjustmentType =
  | "DAMAGED"
  | "DEFECTIVE"
  | "LOST"
  | "EXPIRED"
  | "OTHER";

export type InventoryReturnReasonType =
  | "DAMAGED"
  | "DEFECTIVE"
  | "EXPIRED"
  | "OTHER";

export type InventoryReturnRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type InventoryAdjustment = {
  _id: string;
  storeId: OrderStoreSummary & {
    type?: string;
  };
  productId: Product;
  type: InventoryAdjustmentType;
  quantity: number;
  note?: string;
  createdBy: InventoryRequestUser;
  createdAt: string;
  updatedAt: string;
};

export type InventoryReceiptSource =
  | "DIRECT"
  | "SALES_REQUEST"
  | "TRANSFER"
  | "RETURN_REJECTED";

export type InventoryReceipt = {
  _id: string;
  storeId: OrderStoreSummary & {
    type?: string;
  };
  productId: Product;
  quantity: number;
  source: InventoryReceiptSource;
  note?: string;
  referenceId?: string | null;
  receivedBy: InventoryRequestUser;
  createdAt: string;
  updatedAt: string;
};

export type InventoryReturnRequest = {
  _id: string;
  storeId: OrderStoreSummary & {
    type?: string;
  };
  productId: Product;
  quantity: number;
  currentAvailableStock: number;
  reasonType: InventoryReturnReasonType;
  managerNote?: string;
  reviewNote?: string;
  status: InventoryReturnRequestStatus;
  requestedBy: InventoryRequestUser;
  reviewedBy?: InventoryRequestUser | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IncomingStockTransfer = {
  _id: string;
  fromStoreId: OrderStoreSummary & {
    type?: string;
  };
  toStoreId: OrderStoreSummary & {
    type?: string;
  };
  items: {
    productId: Product;
    quantity: number;
  }[];
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  createdBy: InventoryRequestUser;
  confirmedBy?: InventoryRequestUser | null;
  createdAt: string;
  updatedAt: string;
};
