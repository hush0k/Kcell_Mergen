const normalizeUrl = (value: string) => value.replace(/\/+$/, "");
const normalizePrefix = (value: string) =>
  value.startsWith("/") ? value.replace(/\/+$/, "") : `/${value.replace(/\/+$/, "")}`;

export const API_BASE_URL = normalizeUrl(
  import.meta.env.VITE_API_BASE_URL || "",
);

export const API_PREFIX = normalizePrefix(
  import.meta.env.VITE_API_PREFIX || "/api/v1",
);

export const API_URL = `${API_BASE_URL}${API_PREFIX}`;
