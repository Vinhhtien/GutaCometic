import { IncomingStockTransfer } from "@/types/inventory";
import { Product } from "@/types/product";
import { Store } from "@/types/store";
import { User } from "@/types/user";

export type ManagedStore = Store;

export type ManagedStaff = Omit<User, "storeId"> & {
  storeId?: ManagedStore | string | null;
  disabledAt?: string | null;
  disabledReason?: string;
};

export type OwnerProductPayload = {
  sku: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  costPrice?: number | null;
  originalPrice?: number | null;
  description?: string;
  image?: string;
  images?: string[];
  skinTypes?: string[];
  volume?: string;
  origin?: string;
  expiryDate?: string;
  isActive?: boolean;
};

export type OwnerStorePayload = {
  name: string;
  type: "CENTRAL" | "BRANCH";
  address: string;
  phone: string;
  isActive?: boolean;
};

export type OwnerStaffPayload = {
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  address: string;
  role: "OWNER" | "MANAGER" | "SALES";
  storeId?: string | null;
  isActive?: boolean;
  disabledReason?: string;
};

export type OwnerTransferPayload = {
  fromStoreId: string;
  toStoreId: string;
  items: {
    productId: string;
    quantity: number;
  }[];
};

export type ChainRevenueStore = {
  store: ManagedStore | null;
  orderCount: number;
  paidOrderCount: number;
  revenue: number;
  onlineRevenue: number;
  offlineRevenue: number;
  soldCost: number;
  grossProfit: number;
  writeOffCost: number;
  stockInCost: number;
  inventoryValue: number;
  totalStockUnits: number;
  estimatedNetProfit: number;
};

export type OwnerTransfer = IncomingStockTransfer;

export type OwnerProduct = Product;

export type OwnerRevenueSummary = {
  averageOrderValue: number;
  estimatedNetProfit: number;
  grossProfit: number;
  inventoryValue: number;
  missingCostProductCount: number;
  missingCostProducts: string[];
  monthlyGrossProfit: number;
  monthlyRevenue: number;
  paidOrders: number;
  paidRevenue: number;
  soldCost: number;
  stockInCost: number;
  totalOrders: number;
  writeOffCost: number;
};

export type OwnerRevenueAnalytics = {
  summary: OwnerRevenueSummary;
  stores: ChainRevenueStore[];
};
