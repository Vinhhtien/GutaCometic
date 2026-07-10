import { apiRequest } from "@/services/api";
import { User } from "@/types/user";

export type CustomerLookup = {
  _id: string;
  fullName: string;
  email: string;
  isGuest?: boolean;
  orderCount?: number;
  phone?: string;
  points: number;
};

export const searchCustomers = async (token: string, query: string) => {
  const params = new URLSearchParams();
  params.set("query", query);

  const response = await apiRequest<{ customers: CustomerLookup[] }>(
    `/users/search?${params.toString()}`,
    { token }
  );

  return response.customers;
};

export const redeemCustomerPoints = async (
  token: string,
  customerId: string,
  payload: {
    note?: string;
    points: number;
    rewardName: string;
  }
) => {
  const response = await apiRequest<{
    customer: User;
    redemption: {
      _id: string;
      pointsUsed: number;
      rewardName: string;
    };
  }>(`/users/${customerId}/redeem-points`, {
    body: payload,
    method: "POST",
    token,
  });

  return response;
};
