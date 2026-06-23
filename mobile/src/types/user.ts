export type UserRole = "OWNER" | "MANAGER" | "SALES" | "CUSTOMER";

export type User = {
  _id: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone?: string;
  emailVerified?: boolean;
  address?: string;
  storeId?: string | null;
  points: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LoginPayload = {
  identifier: string;
  password: string;
};

export type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  address: string;
};

export type OtpRequestResponse = {
  challengeId: string;
  channel?: "EMAIL" | "PHONE";
  deliveryTarget: string;
  developmentOtp?: string;
  expiresIn: number;
};

export type VerifyRegistrationOtpPayload = {
  challengeId: string;
  otp: string;
};

export type VerifyResetOtpResponse = {
  resetToken: string;
  expiresIn: number;
};

export type AuthResponse = {
  user: User;
  token: string;
};
