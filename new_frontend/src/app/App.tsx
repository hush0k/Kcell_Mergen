import { Routes, Route } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";

export function App() {
    return (
        <main className="mg-app-shell min-h-screen bg-mg-bg text-mg-text">
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                {/* сюда добавляй остальные страницы */}
            </Routes>
        </main>
    );
}