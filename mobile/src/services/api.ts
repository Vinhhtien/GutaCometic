import Constants from "expo-constants";
import { Platform } from "react-native";

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
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  { body, headers, token, ...options }: ApiOptions = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
  };

  if (!response.ok) {
    throw new ApiError(data.message || "Request failed", response.status);
  }

  return data as T;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
}
