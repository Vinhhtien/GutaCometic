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

export type Order = {
  _id: string;
  orderCode: string;
  channel: string;
  fulfillmentType: string;
  storeId: string;
  items: OrderItem[];
  subtotal: number;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  shippingAddress: ShippingAddress | null;
  createdAt: string;
};

export type CreateOnlineOrderPayload = {
  storeId: string;
  fulfillmentType: "DELIVERY" | "STORE_PICKUP";
  items: { productId: string; quantity: number }[];
  shippingAddress?: ShippingAddress;
  paymentMethod?: string;
};
