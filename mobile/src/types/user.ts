export type UserRole = "OWNER" | "MANAGER" | "SALES" | "CUSTOMER";

export type User = {
  _id: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone: string;
  address: string;
  storeId?: string | null;
  points: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = LoginPayload & {
  fullName: string;
  phone: string;
  address: string;
};

export type AuthResponse = {
  user: User;
  token: string;
};
