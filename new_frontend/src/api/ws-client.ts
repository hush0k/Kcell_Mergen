import { API_WS_URL } from "@/api/config";
import { apiEndpoints } from "@/api/endpoints";
import { tokenStorage } from "@/api/token-storage";
import { refreshAccessToken } from "@/api/client";
import { useNotificationStore } from "@/features/notifications/store";
import type { NotificationSocketMessage } from "@/types/api";

const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;
const AUTH_CLOSE_CODE = 1008;

function buildWsUrl(token: string): string {
    const url = `${API_WS_URL}${apiEndpoints.notifications.websocket}?token=${encodeURIComponent(token)}`;

    if (import.meta.env.DEV) {
        console.log("[notificationSocket] connecting to", url);
    }

    return url;
}

class NotificationSocket {
    private socket: WebSocket | null = null;
    private manuallyClosed = false;
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private authRefreshInFlight = false;

    connect(): void {
        if (
            this.socket?.readyState === WebSocket.OPEN ||
            this.socket?.readyState === WebSocket.CONNECTING
        ) {
            return;
        }

        const token = tokenStorage.getAccessToken();
        if (!token) return;

        this.manuallyClosed = false;
        this.clearReconnectTimer();

        const socket = new WebSocket(buildWsUrl(token));
        this.socket = socket;

        socket.onopen = () => {
            this.reconnectAttempts = 0;
            this.authRefreshInFlight = false;
            useNotificationStore.getState().setConnected(true);
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as NotificationSocketMessage;
                useNotificationStore.getState().handleIncoming(data);
            } catch (error) {
                console.error("[notificationSocket] failed to parse incoming message", error);
            }
        };

        socket.onclose = (event) => {
            useNotificationStore.getState().setConnected(false);

            if (this.manuallyClosed) return;

            if (event.code === AUTH_CLOSE_CODE) {
                void this.tryRefreshAndReconnect();
                return;
            }

            this.scheduleReconnect();
        };

        socket.onerror = () => {
            socket.close();
        };
    }

    disconnect(): void {
        this.manuallyClosed = true;
        this.clearReconnectTimer();

        if (this.socket) {
            if (this.socket.readyState === WebSocket.CONNECTING) {
                // close() на CONNECTING-сокете кидает ошибку в консоль —
                // ждём открытия и закрываем сразу после
                this.socket.onopen = () => this.socket?.close();
            } else {
                this.socket.close();
            }
        }
        this.socket = null;
    }

    private async tryRefreshAndReconnect(): Promise<void> {
        if (this.authRefreshInFlight) return;

        this.authRefreshInFlight = true;
        const newAccessToken = await refreshAccessToken();
        this.authRefreshInFlight = false;

        if (!newAccessToken) {
            tokenStorage.clear();
            return;
        }

        this.connect();
    }

    private scheduleReconnect(): void {
        this.reconnectAttempts += 1;
        const delay = Math.min(
            BASE_RECONNECT_DELAY_MS * 2 ** (this.reconnectAttempts - 1),
            MAX_RECONNECT_DELAY_MS,
        );
        const jitter = delay * 0.2 * Math.random();

        this.clearReconnectTimer();
        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay + jitter);
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
}

export const notificationSocket = new NotificationSocket();