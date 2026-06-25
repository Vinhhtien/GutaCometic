import { apiRequest } from "@/services/api";
import { User } from "@/types/user";

export type UpdateProfilePayload = {
  fullName: string;
  phone: string;
  address: string;
};

export const updateProfile = (token: string, payload: UpdateProfilePayload) =>
  apiRequest<{ user: User }>("/users/profile", {
    method: "PUT",
    body: payload,
    token,
  });
