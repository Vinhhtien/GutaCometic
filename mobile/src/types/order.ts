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

export type Order = {
  _id: string;
  orderCode: string;
  channel: string;
  fulfillmentType: string;
  storeId: string | OrderStoreSummary;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  checkoutUrl?: string;
  shippingAddress: ShippingAddress | null;
  createdAt: string;
};

export type PaymentMethod = "COD" | "BANK_TRANSFER";

export type PaymentLink = {
  checkoutUrl: string;
  expiredAt?: string;
  paymentLinkId?: string;
  qrImage?: string | null;
  qrCode?: string;
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
