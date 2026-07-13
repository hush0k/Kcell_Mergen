import { Outlet } from "react-router-dom";
import { Sidebar } from "@/features/note_home/components/Sidebar"
import { SidebarProvider } from "@/contexts/SidebarContext"
import { NoteSelectionProvider } from "@/contexts/NoteSelectionContext";

export function NoteLayout() {

    return (
        <SidebarProvider>
            <div className="flex flex-col h-screen">
                <SidebarProvider>
                    <NoteSelectionProvider>
                        <div className="flex flex-col h-screen">
                            <main className="flex flex-row flex-1 overflow-hidden">
                                <Sidebar />
                                <div className="flex-1 overflow-auto">
                                    <Outlet />
                                </div>
                            </main>
                        </div>
                    </NoteSelectionProvider>
                </SidebarProvider>
            </div>
        </SidebarProvider>
    )
}