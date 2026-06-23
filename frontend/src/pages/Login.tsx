import React, { useState } from "react";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { useNavigate } from "react-router-dom";

interface LoginProps {
  onLogin: (token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Ошибка входа");
        setLoading(false);
        return;
      }
      const resData = await res.json();
      const meRes = await fetch("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${resData.access_token}` },
      });
      const me = await meRes.json();
      localStorage.setItem("token", resData.access_token);
      localStorage.setItem("refresh_token", resData.refresh_token);
      localStorage.setItem("username", me.username);
      localStorage.setItem("role", me.role);
      onLogin(resData.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-full max-w-sm border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">Вход</h2>
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Логин</label>
          <Input
            type="text"
            value={username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Пароль</label>
          <Input
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="text-red-500 mb-4 text-sm">{error}</div>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Вход..." : "Войти"}
        </Button>
      </form>
    </div>
  );
}; 