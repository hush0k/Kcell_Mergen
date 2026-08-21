import { API_URL } from "@/api/config";
import { apiEndpoints } from "@/api/endpoints";
import { tokenStorage } from "@/api/token-storage";
import type { TokenResponse } from "@/types/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public payload: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface RequestOptions extends Omit<RequestInit, "body" | "method"> {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
}

const isFormData = (value: unknown): value is FormData => value instanceof FormData;

interface FastApiValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === "object" && payload !== null && "detail" in payload) {
    const detail = (payload as { detail: unknown }).detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      const messages = (detail as FastApiValidationError[])
        .map((err) => {
          const field = Array.isArray(err.loc) ? err.loc.filter((p) => p !== "body").join(".") : "";
          return field ? `${field}: ${err.msg}` : err.msg;
        })
        .filter(Boolean);

      if (messages.length > 0) {
        return messages.join("; ");
      }
    }
  }

  return `Request failed with status ${status}`;
}

async function parseResponse(response: Response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export async function refreshAccessToken() {
  const refreshToken = tokenStorage.getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${API_URL}${apiEndpoints.auth.refresh}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    tokenStorage.clear();
    return null;
  }

  const tokens = (await response.json()) as TokenResponse;
  tokenStorage.setTokens(tokens.access_token, tokens.refresh_token);
  return tokens.access_token;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    headers,
    auth = true,
    retryOnUnauthorized = true,
    ...rest
  } = options;

  const requestHeaders = new Headers(headers);

  if (auth) {
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken) {
      requestHeaders.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  const requestInit: RequestInit = {
    ...rest,
    method,
    headers: requestHeaders,
  };

  if (body !== undefined) {
    if (isFormData(body)) {
      requestInit.body = body;
    } else {
      requestHeaders.set("Content-Type", "application/json");
      requestInit.body = JSON.stringify(body);
    }
  }

  const response = await fetch(`${API_URL}${endpoint}`, requestInit);

  if (response.status === 401 && auth && retryOnUnauthorized) {
    const accessToken = await refreshAccessToken();

    if (accessToken) {
      return apiRequest<T>(endpoint, {
        ...options,
        retryOnUnauthorized: false,
      });
    }
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    const message = extractErrorMessage(payload, response.status);

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}
