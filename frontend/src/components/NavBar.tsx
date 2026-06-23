import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useDeployment } from "../context/DeploymentContext";

interface NavBarProps {
    onLogout: () => void;
}

const hiddenOnFull = new Set(["/dev-tasks", "/riskmap"]);
const navItemsAll = [
    { to: "/dashboard", label: "To-Do List" },
    { to: "/controls", label: "Список контролей" },
    { to: "/incidents", label: "Инциденты" },
    { to: "/alarms", label: "Алармы" },
    { to: "/mfs", label: "МФС" },
    { to: "/vacation-schedule", label: "Расписание отпусков" },
    { to: "/reports", label: "Отчеты" },
];

const navLitePaths = new Set(["/dashboard", "/controls", "/reports"]);

export const NavBar: React.FC<NavBarProps> = ({ onLogout }) => {
    const location = useLocation();
    const [user, setUser] = useState<{ username: string } | null>(null);
    const { theme, toggleTheme } = useTheme();
    const { deployment } = useDeployment();

    const navItems = useMemo(() => {
        if (deployment === "lite") {
            return navItemsAll.filter((item) => navLitePaths.has(item.to));
        }
        return navItemsAll.filter((item) => !hiddenOnFull.has(item.to));
    }, [deployment]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const username = localStorage.getItem("username");

        if (token && username) {
            setUser({ username });
        } else {
            // This case should ideally not happen if App component logic is correct
            // but as a fallback, we can trigger logout.
            onLogout();
        }
    }, [onLogout]);

    return (
        <nav className="bg-white shadow-sm mb-8 sticky top-0 z-40 border-b dark:bg-gray-800 dark:border-gray-700">
            <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
                {/* Левая колонка — тема; flex-1 тянет как справа, чтобы центр был по середине экрана */}
                <div className="flex min-w-0 flex-1 items-center justify-start">
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="shrink-0 rounded-full p-2 text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        aria-label={theme === "light" ? "Тёмная тема" : "Светлая тема"}
                    >
                        {theme === 'light' ? 
                            ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-15.66l-.707.707M4.34 19.66l-.707.707M21 12h-1M4 12H3m15.66 8.66l-.707-.707M4.34 4.34l-.707-.707" /></svg> ) : 
                            ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> )
                        }
                    </button>
                </div>

                {/* Навигация — по центру между колонками, с нормальными отступами между пунктами */}
                <div className="flex min-w-0 shrink flex-wrap items-center justify-center gap-x-1 gap-y-1 sm:gap-x-2 md:gap-x-3">
                    {navItems.map(item => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 sm:text-base text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white ${location.pathname === item.to ? "bg-blue-100 text-blue-900 dark:bg-gray-700 dark:text-white" : ""}`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>

                {/* Правая колонка — пользователь; та же flex-1 для симметрии слева */}
                <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
                    <span className="max-w-[7rem] truncate text-right text-sm font-semibold text-gray-700 dark:text-gray-200 sm:max-w-[12rem] sm:text-base md:max-w-[16rem]">
                        {user?.username}
                    </span>
                    <button
                        type="button"
                        onClick={onLogout}
                        className="shrink-0 whitespace-nowrap rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 sm:px-4 sm:text-base"
                    >
                        Выйти
                    </button>
                </div>
            </div>
        </nav>
    );
}; 