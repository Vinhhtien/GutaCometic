export type OrderItem = {
  productId: string;
  sku: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type ShippingAddress = {
  recipientName: string;
  phone: string;
  addressLine: string;
};

export type OrderStoreSummary = {
  _id: string;
  name: string;
  address?: string;
  phone?: string;
};

export type OrderCustomerSummary = {
  _id: string;
  fullName: string;
  email?: string;
  phone?: string;
  points: number;
};

export type Order = {
  _id: string;
  orderCode: string;
  channel: string;
  fulfillmentType: string;
  storeId: string | OrderStoreSummary;
  customerId?: string | OrderCustomerSummary | null;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  discountAmount?: number;
  shippingFee: number;
  pointsUsed?: number;
  pointsEarned?: number;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  paymentProvider?: string | null;
  paymentOrderCode?: number;
  paymentLinkId?: string;
  paymentReference?: string;
  paymentProviderUpdatedAt?: string | null;
  paymentExpiresAt?: string | null;
  checkoutUrl?: string;
  qrCode?: string;
  shippingAddress: ShippingAddress | null;
  isReviewed: boolean;
  paidAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type PaymentMethod = "COD" | "BANK_TRANSFER";

export type PaymentLink = {
  checkoutUrl: string;
  expiredAt?: string;
  paymentLinkId?: string;
  qrImage?: string | null;
  qrCode?: string;
};

export type PosPaymentOptions = {
  discountPercent?: number;
};

export type CreateOnlineOrderPayload = {
  storeId: string;
  fulfillmentType: "DELIVERY" | "STORE_PICKUP";
  items: { productId: string; quantity: number }[];
  shippingAddress?: ShippingAddress | null;
  shippingFee?: number;
  paymentMethod?: PaymentMethod;
};

export type CreateOnlineOrderResponse = {
  order: Order;
  payment?: PaymentLink;
};

export type CreateOfflineOrderPayload = {
  storeId: string;
  items: { productId: string; quantity: number }[];
  customerName?: string;
  customerPhone?: string;
  customerId?: string | null;
};
