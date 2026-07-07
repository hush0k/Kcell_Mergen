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

const toWsOrigin = (httpOrigin: string) =>
  httpOrigin.replace(/^https/, "wss").replace(/^http/, "ws");

// Falls back to the current page origin when VITE_API_BASE_URL isn't set, so this
// resolves through the Vite dev proxy (see vite.config.ts `ws: true`) instead of
// producing a bare relative URL that the browser would resolve to the wrong port.
export const API_WS_URL = `${
  API_BASE_URL
    ? toWsOrigin(API_BASE_URL)
    : toWsOrigin(window.location.origin)
}${API_PREFIX}`;
