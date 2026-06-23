import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Controls } from './pages/Controls';
import { Incidents } from './pages/Incidents';
import { Alarms } from './pages/Alarms';
import { Reports } from './pages/Reports';
import VacationSchedule from './pages/VacationSchedule';
import { Mfs } from './pages/Mfs';
import { NavBar } from './components/NavBar';
import { ThemeProvider } from './context/ThemeContext';
import { DeploymentProvider, useDeployment } from './context/DeploymentContext';
import './index.css';

function AppRoutes() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const { deployment, loading } = useDeployment();
  const isLite = deployment === 'lite';

  const handleLogin = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    setToken(null);
  };

  if (token && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
        Загрузка…
      </div>
    );
  }

  const authenticatedRoutes = isLite ? (
    <>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/controls" element={<Controls />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </>
  ) : (
    <>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/controls" element={<Controls />} />
      <Route path="/incidents" element={<Incidents />} />
      <Route path="/alarms" element={<Alarms />} />
      <Route path="/dev-tasks" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dev-tasks/:id" element={<Navigate to="/dashboard" replace />} />
      <Route path="/vacation-schedule" element={<VacationSchedule />} />
      <Route path="/mfs" element={<Mfs />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
      {token && <NavBar onLogout={handleLogout} />}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          {!token ? (
            <>
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </>
          ) : (
            authenticatedRoutes
          )}
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <DeploymentProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </DeploymentProvider>
    </ThemeProvider>
  );
}
