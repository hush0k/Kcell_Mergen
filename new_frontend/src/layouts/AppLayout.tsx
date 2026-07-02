import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "@/components/Header"
import { Sidebar } from "@/features/home/components/Sidebar"
import { SidebarProvider } from "@/contexts/SidebarContext"
import { useNotificationSocket } from "@/features/notifications/hooks/useNotificationSocket"
import { useNotificationStore } from "@/features/notifications/store"
import { api } from "@/api/resources"

export function AppLayout() {
    useNotificationSocket();

    useEffect(() => {
        const setInitial = useNotificationStore.getState().setInitial;

        Promise.all([api.notifications.list(), api.notifications.unreadCount()])
            .then(([notifications, { unread_count }]) => setInitial(notifications, unread_count))
            .catch((error) => console.error("[AppLayout] failed to load initial notifications", error));
    }, []);

    return (
        <SidebarProvider>
            <div className="flex flex-col h-screen">
                <Header />
                <main className="flex flex-row flex-1 overflow-hidden">
                    <Sidebar    />
                    <div className="flex-1 overflow-auto">
                        <Outlet /> {/* сюда рендерятся страницы */}
                    </div>
                </main>
            </div>
        </SidebarProvider>
    )
}