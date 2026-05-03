import Constants from "expo-constants";
import { clearSession, getToken } from "./auth";
import type {
  DriverLoginRequest,
  DriverLoginResponse,
  DriverOrder,
  OrderStatus,
} from "./types";

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "http://10.0.2.2:3000";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type JsonBody = Record<string, unknown> | undefined;

async function request<T>(
  path: string,
  options: { method?: string; body?: JsonBody; auth?: boolean; form?: FormData } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;

  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  if (options.auth !== false) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? (body ? "POST" : "GET"),
    headers,
    body,
  });

  if (res.status === 401) {
    await clearSession();
    throw new ApiError("Session expired", 401, "UNAUTHORIZED");
  }

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = json?.error?.message ?? json?.message ?? `HTTP ${res.status}`;
    throw new ApiError(message, res.status, json?.error?.code);
  }

  return json as T;
}

export const api = {
  login: (creds: DriverLoginRequest) =>
    request<DriverLoginResponse>("/api/driver/login", {
      method: "POST",
      body: creds as unknown as JsonBody,
      auth: false,
    }),

  me: () => request<{ driver: import("./types").Driver }>("/api/driver/me"),

  listOrders: (params: { includeCompleted?: boolean } = {}) => {
    const qs = params.includeCompleted ? "?include=completed" : "";
    return request<{ orders: DriverOrder[] }>(`/api/driver/orders${qs}`);
  },

  getOrder: (id: string) =>
    request<{ order: DriverOrder }>(`/api/driver/orders/${id}`),

  updateStatus: (id: string, status: OrderStatus, note?: string) =>
    request<{ order: DriverOrder }>(`/api/driver/orders/${id}/status`, {
      method: "PATCH",
      body: { status, note },
    }),

  uploadPod: (id: string, form: FormData) =>
    request<{ order: DriverOrder }>(`/api/driver/orders/${id}/pod`, {
      method: "POST",
      form,
    }),
};

export { API_BASE_URL };
