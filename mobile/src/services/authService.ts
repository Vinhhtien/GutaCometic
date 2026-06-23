import { apiRequest } from "@/services/api";
import {
  AuthResponse,
  LoginPayload,
  OtpRequestResponse,
  RegisterPayload,
  VerifyRegistrationOtpPayload,
  VerifyResetOtpResponse,
} from "@/types/user";

export const login = (payload: LoginPayload) =>
  apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: payload,
  });

export const loginWithGoogle = (idToken: string) =>
  apiRequest<AuthResponse>("/auth/google", {
    method: "POST",
    body: { idToken },
  });

export const requestRegistrationOtp = (payload: RegisterPayload) =>
  apiRequest<OtpRequestResponse>("/auth/register/request-otp", {
    method: "POST",
    body: payload,
  });

export const verifyRegistrationOtp = (
  payload: VerifyRegistrationOtpPayload
) =>
  apiRequest<AuthResponse>("/auth/register/verify-otp", {
    method: "POST",
    body: payload,
  });

export const requestPasswordResetOtp = (identifier: string) =>
  apiRequest<OtpRequestResponse>("/auth/password/forgot/request-otp", {
    method: "POST",
    body: { identifier },
  });

export const verifyPasswordResetOtp = (
  challengeId: string,
  otp: string
) =>
  apiRequest<VerifyResetOtpResponse>("/auth/password/forgot/verify-otp", {
    method: "POST",
    body: { challengeId, otp },
  });

export const resetPassword = (
  resetToken: string,
  password: string,
  confirmPassword: string
) =>
  apiRequest<{ message: string }>("/auth/password/reset", {
    method: "POST",
    body: { resetToken, password, confirmPassword },
  });
