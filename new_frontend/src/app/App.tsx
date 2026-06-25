import { Routes, Route } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage"

export function App() {
    return (
        <main className="mg-app-shell min-h-screen bg-mg-bg text-mg-text">
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/home" element={<HomePage />} />
                {/* сюда добавляй остальные страницы */}
            </Routes>
        </main>
    );
}