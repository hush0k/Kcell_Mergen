import { create } from "zustand";
import { api } from "@/api/resources";
import type {
    Id,
    NotificationRecipient,
    NotificationSocketMessage,
} from "@/types/api";

interface NotificationState {
    notifications: NotificationRecipient[];
    unreadCount: number;
    isConnected: boolean;
    setConnected: (connected: boolean) => void;
    handleIncoming: (data: NotificationSocketMessage) => void;
    setInitial: (notifications: NotificationRecipient[], unreadCount: number) => void;
    markAsRead: (id: Id) => Promise<void>;
}

// Live notification pushes only carry {notification_id, title, unread_count} (see backend
// notification/listener.py), not a full NotificationRecipient — the rest is filled with
// placeholders until the full record is fetched (e.g. via the HTML endpoint on open).
function toPreviewRecipient(notificationId: Id, title: string | null): NotificationRecipient {
    return {
        id: notificationId,
        notification_id: notificationId,
        recipient_id: 0,
        is_read: false,
        read_at: null,
        notification: {
            id: notificationId,
            notification_type: "TASK_CREATED",
            responsible_user_id: null,
            sender: "",
            title,
            html_content: "",
            error_message: null,
            created_at: new Date().toISOString(),
        },
    };
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isConnected: false,

    setConnected: (connected) => set({ isConnected: connected }),

    setInitial: (notifications, unreadCount) => set({ notifications, unreadCount }),

    handleIncoming: (data) => {
        if ("type" in data) {
            // task-claimed event, not a new notification for this list
            return;
        }

        set((state) => ({
            notifications: [toPreviewRecipient(data.notification_id, data.title), ...state.notifications],
            unreadCount: data.unread_count,
        }));
    },

    markAsRead: async (id) => {
        const target = get().notifications.find((n) => n.id === id);
        if (!target || target.is_read) return;

        set((state) => ({
            notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n,
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
        }));

        try {
            await api.notifications.read(id);
        } catch (error) {
            // rollback optimistic update on failure
            set((state) => ({
                notifications: state.notifications.map((n) =>
                    n.id === id ? { ...n, is_read: false, read_at: null } : n,
                ),
                unreadCount: state.unreadCount + 1,
            }));
            throw error;
        }
    },
}));
