export type Review = {
  _id: string;
  productId: string;
  orderId: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
};
