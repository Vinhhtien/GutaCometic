import { Href } from "expo-router";
import { UserRole } from "@/types/user";

export const getHomeRouteForRole = (role?: UserRole): Href => {
  if (role === "OWNER") {
    return "/owner" as Href;
  }

  if (role === "MANAGER") {
    return "/manager" as Href;
  }

  if (role === "SALES") {
    return "/sales" as Href;
  }

  return "/customer/home" as Href;
};
