import { apiRequest } from "@/services/api";
import {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
} from "@/types/user";

export const login = (payload: LoginPayload) =>
  apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: payload,
  });

export const register = (payload: RegisterPayload) =>
  apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: payload,
  });
