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

const normalizeApiUrl = (value: string) => value.replace(/\/$/, "");

const configuredApiUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const configuredApiBaseUrl = configuredApiUrl
  ? normalizeApiUrl(configuredApiUrl)
  : null;
const metroApiBaseUrl = getMetroApiUrl();

const uniqueUrls = (urls: Array<string | null>) =>
  [...new Set(urls.filter(Boolean))] as string[];

const getApiBaseUrlsForPath = (path: string) => {
  if (path.startsWith("/inventory/return-requests")) {
    return uniqueUrls([configuredApiBaseUrl, metroApiBaseUrl]);
  }

  return uniqueUrls([metroApiBaseUrl, configuredApiBaseUrl]);
};

export const API_BASE_URL = metroApiBaseUrl;

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

  const requestBody = body === undefined ? undefined : JSON.stringify(body);
  let lastError: unknown = null;

  for (const baseUrl of getApiBaseUrlsForPath(path)) {
    let response: Response;

    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(activeStore?._id ? { "X-Active-Store-Id": activeStore._id } : {}),
          ...headers,
        },
        body: requestBody,
      });
    } catch (error) {
      lastError = error;
      continue;
    }

    const data = (await response.json().catch(() => ({}))) as {
      code?: string;
      details?: Record<string, unknown>;
      message?: string;
    };

    if (response.ok) {
      return data as T;
    }

    const apiError = new ApiError(
      data.message || "Request failed",
      response.status,
      data.code,
      data.details
    );

    const shouldTryNextBaseUrl =
      response.status === 404 &&
      /route not found/i.test(data.message || "");

    if (!shouldTryNextBaseUrl) {
      throw apiError;
    }

    lastError = apiError;
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to connect to the API server");
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
}
