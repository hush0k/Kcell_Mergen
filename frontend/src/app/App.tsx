import { Routes, Route } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage"
import { ControllerPage } from "@/pages/ControllerPage"
import { IncidentsPage } from "@/pages/IncidentsPage"
import { MfsPage } from "@/pages/MfsPage"
import { Tele2Page } from "@/pages/Tele2Page"
import { NotificaitonsPage } from "@/pages/NotificaitonsPage"
import { ReportsPage } from "@/pages/ReportsPage"
import { VacationPage } from "@/pages/VacationPage"
import { NumberInformationPage } from "@/pages/NumberInformationPage"
import { NumberInformationSqlPage } from "@/pages/NumberInformationSqlPage"
import { MergenNoteMainPage } from "@/pages/MergenNoteMainPage"
import { MeNoteGraphPage } from "@/pages/MeNoteGraphPage"
import { ProfilePage } from "@/pages/ProfilePage"
import { ForceChangePasswordPage } from "@/pages/ForceChangePasswordPage"
import { AdminPage } from "@/pages/AdminPage"
import { PrivateRoute } from '@/components/PrivateRoute'
import { Navigate } from 'react-router-dom'
import { AppLayout } from "@/layouts/AppLayout"
import { NoteLayout } from "@/layouts/NoteLayout"

export function App() {
    return (
        <main className="mg-app-shell min-h-screen bg-mg-bg text-mg-text">
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                    path="/force-change-password"
                    element={<PrivateRoute><ForceChangePasswordPage /></PrivateRoute>}
                />
                <Route
                    path="/numberInformation/sql/:id"
                    element={<PrivateRoute><NumberInformationSqlPage /></PrivateRoute>}
                />
                <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/incidents" element={<IncidentsPage />} />
                    <Route path="/mfs" element={<MfsPage />} />
                    <Route path="/tele2" element={<Tele2Page />} />
                    <Route path="/notifications" element={<NotificaitonsPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/vacation" element={<VacationPage />} />
                    <Route path="/controllers" element={<ControllerPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/numberInformation" element={<NumberInformationPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                </Route>
                <Route element={<PrivateRoute><NoteLayout /></PrivateRoute>}>
                    <Route path="/mergen-note" element={<MergenNoteMainPage />} />
                    <Route path="/workspace" element={<MergenNoteMainPage />} />
                    <Route path="/graph" element={<MeNoteGraphPage />} />
                </Route>
                <Route path="/" element={<Navigate to="/home" replace />} />

            </Routes>
        </main>
    );
}
