import { Outlet } from "react-router-dom";
import { Header } from "@/components/Header"
import { Sidebar } from "@/features/home/components/Sidebar"
import { SidebarProvider } from "@/contexts/SidebarContext"

export function AppLayout() {
    return (
        <SidebarProvider>
            <div className="flex flex-col h-screen">
                <Header />
                <main className="flex flex-row flex-1 overflow-hidden">
                    <Sidebar />
                    <div className="flex-1 overflow-auto">
                        <Outlet /> {/* сюда рендерятся страницы */}
                    </div>
                </main>
            </div>
        </SidebarProvider>
    )
}