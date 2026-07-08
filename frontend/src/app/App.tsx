import { Routes, Route } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage"
import { ControllerPage } from "@/pages/ControllerPage"
import { IncidentsPage } from "@/pages/IncidentsPage"
import { MfsPage } from "@/pages/MfsPage"
import { NotificaitonsPage } from "@/pages/NotificaitonsPage"
import { ReportsPage } from "@/pages/ReportsPage"
import { VacationPage } from "@/pages/VacationPage"
import { MergenNoteMainPage } from "@/pages/MergenNoteMainPage"
import { PrivateRoute } from '@/components/PrivateRoute'
import { Navigate } from 'react-router-dom'
import { AppLayout } from "@/layouts/AppLayout"

export function App() {
    return (
        <main className="mg-app-shell min-h-screen bg-mg-bg text-mg-text">
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/incidents" element={<IncidentsPage />} />
                    <Route path="/mfs" element={<MfsPage />} />
                    <Route path="/notifications" element={<NotificaitonsPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/vacation" element={<VacationPage />} />
                    <Route path="/controllers" element={<ControllerPage />} />
                </Route>
                <Route
                    path="/mergen-note"
                    element={<PrivateRoute><MergenNoteMainPage /></PrivateRoute>}
                />
                <Route path="/" element={<Navigate to="/home" replace />} />

            </Routes>
        </main>
    );
}