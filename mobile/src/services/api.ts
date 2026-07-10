import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { ACTIVE_STORE_STORAGE_KEY } from "@/constants/session";
import { Store } from "@/types/store";

const getMetroApiUrl = () => {
  if (Platform.OS === "web") {
    return "/api";
  }

  const hostUri = Constants.expoConfig?.hostUri;

  if (!hostUri) {
    throw new Error(
      "Expo host is unavailable. Start the app with: npm run tunnel"
    );
  }

  const protocol = hostUri.endsWith(".exp.direct") ? "https" : "http";
  return `${protocol}://${hostUri}/api`;
};

export const API_BASE_URL = getMetroApiUrl();

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string | null;
};

export class ApiError extends Error {
  code?: string;
  details?: Record<string, unknown>;
  status: number;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  { body, headers, token, ...options }: ApiOptions = {}
): Promise<T> {
  const storedActiveStore = await AsyncStorage.getItem(ACTIVE_STORE_STORAGE_KEY);
  const activeStore = storedActiveStore
    ? (JSON.parse(storedActiveStore) as Store)
    : null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(activeStore?._id ? { "X-Active-Store-Id": activeStore._id } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as {
    code?: string;
    details?: Record<string, unknown>;
    message?: string;
  };

  if (!response.ok) {
    throw new ApiError(
      data.message || "Request failed",
      response.status,
      data.code,
      data.details
    );
  }

  return data as T;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
}
