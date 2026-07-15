import { API_WS_URL } from "@/api/config";
import { apiEndpoints } from "@/api/endpoints";
import { tokenStorage } from "@/api/token-storage";
import { refreshAccessToken } from "@/api/client";

const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;
const AUTH_CLOSE_CODE = 1008;

export interface MeNoteSocketMessage {
    note_id: number;
    action: "INSERT" | "UPDATE" | "DELETE";
}

type Listener = (message: MeNoteSocketMessage) => void;

function buildWsUrl(token: string): string {
    return `${API_WS_URL}${apiEndpoints.meNote.websocket}?token=${encodeURIComponent(token)}`;
}

class MeNoteSocket {
    private socket: WebSocket | null = null;
    private manuallyClosed = false;
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private authRefreshInFlight = false;
    private listeners = new Set<Listener>();

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

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
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as MeNoteSocketMessage;
                this.listeners.forEach((listener) => listener(data));
            } catch (error) {
                console.error("[meNoteSocket] failed to parse incoming message", error);
            }
        };

        socket.onclose = (event) => {
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

        const socket = this.socket;
        this.socket = null;

        if (!socket) return;

        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;

        if (socket.readyState === WebSocket.CONNECTING) {
            socket.onopen = () => socket.close();
        } else {
            socket.close();
        }
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

export const meNoteSocket = new MeNoteSocket();