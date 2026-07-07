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
    // Set to a fresh object reference each time a genuine WS push arrives (never on
    // setInitial), so consumers can useEffect on it to react only to real pushes.
    lastPush: NotificationRecipient | null;
    setConnected: (connected: boolean) => void;
    handleIncoming: (data: NotificationSocketMessage) => void;
    setInitial: (notifications: NotificationRecipient[], unreadCount: number) => void;
    markAsRead: (id: Id) => Promise<void>;
    decrementUnread: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isConnected: false,
    lastPush: null,

    setConnected: (connected) => set({ isConnected: connected }),

    setInitial: (notifications, unreadCount) => set({ notifications, unreadCount }),

    handleIncoming: (data) => {
        if ("type" in data) {
            // task-claimed event, not a new notification for this list
            return;
        }

        set({ unreadCount: data.unread_count });

        // The WS payload only carries id/title/sender/unread_count — fetch the real
        // record instead of faking one, so every field (html_content, created_at, etc.)
        // is accurate from the moment it appears.
        api.notifications.list({ page: 1, limit: 1 }).then((res) => {
            const fresh = res.notifications.find((n) => n.notification_id === data.notification_id);
            if (!fresh) return;

            set((state) => {
                if (state.notifications.some((n) => n.id === fresh.id)) return state;
                return { notifications: [fresh, ...state.notifications], lastPush: fresh };
            });
        });
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

    decrementUnread: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
}));
