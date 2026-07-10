export const ACTIVE_STORE_STORAGE_KEY = "guta_cosmetic_active_store";

export const STAFF_ROLES = ["MANAGER", "SALES"] as const;

export const isStaffRole = (role?: string | null) =>
  role === "MANAGER" || role === "SALES";
