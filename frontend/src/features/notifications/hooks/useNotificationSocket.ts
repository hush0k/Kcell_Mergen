import { useEffect } from "react";
import { notificationSocket } from "@/api/ws-client";

// Call once at the app root (after auth) — the socket is a singleton, calling
// this in multiple components would not open extra connections but is still wasted work.
export function useNotificationSocket() {
    useEffect(() => {
        notificationSocket.connect();
        return () => notificationSocket.disconnect();
    }, []);
}
