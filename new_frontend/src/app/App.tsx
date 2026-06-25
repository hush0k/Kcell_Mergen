import { Routes, Route } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage"
import { PrivateRoute } from '@/components/PrivateRoute'
import { Navigate } from 'react-router-dom'

export function App() {
    return (
        <main className="mg-app-shell min-h-screen bg-mg-bg text-mg-text">
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/home" element={
                    <PrivateRoute>
                        <HomePage />
                    </PrivateRoute>
                } />
                <Route path="/" element={<Navigate to="/home" replace />} />

            </Routes>
        </main>
    );
}