import React, { useCallback, useEffect, useState } from "react";
import { Button } from "../components/Button";

interface ReportMeta {
  id: string;
  title: string;
  description: string;
}

export const ReportExports: React.FC = () => {
  const [catalog, setCatalog] = useState<ReportMeta[]>([]);
  const [selectedId, setSelectedId] = useState("viktoriya");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastInfo, setLastInfo] = useState("");

  const apiHeaders = (json = false): HeadersInit => {
    const token = localStorage.getItem("token");
    const h: HeadersInit = {};
    if (token) h.Authorization = `Bearer ${token}`;
    if (json) h["Content-Type"] = "application/json";
    return h;
  };

  const loadCatalog = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/catalog", { headers: apiHeaders() });
      const data = await res.json().catch(() => []);
      if (res.ok && Array.isArray(data)) {
        setCatalog(data);
        if (data.length && !data.find((r: ReportMeta) => r.id === selectedId)) {
          setSelectedId(data[0].id);
        }
      }
    } catch {
      /* ignore */
    }
  }, [selectedId]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const runReport = async () => {
    setError("");
    setLastInfo("");
    if (!text.trim()) {
      setError("Вставьте номера — по одному на строку");
      return;
    }
    if (selectedId !== "viktoriya") {
      setError("Отчёт пока не реализован");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/reports/viktoriya/run", {
        method: "POST",
        headers: apiHeaders(true),
        body: JSON.stringify({ msisdns: text }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const parts = [data.msg, data.detail, data.hint].filter(Boolean);
        setError(parts.join(" — ") || "Ошибка отчёта");
        return;
      }

      const blob = await res.blob();
      const rows = res.headers.get("X-Report-Rows");
      const cd = res.headers.get("Content-Disposition") || "";
      const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(cd);
      const filename = match ? decodeURIComponent(match[1].replace(/"/g, "")) : "Viktoriya.xlsx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setLastInfo(
        rows
          ? `Файл ${filename} сформирован, строк: ${rows}.`
          : `Файл ${filename} сформирован.`
      );
    } catch {
      setError("Ошибка сети или сервера");
    } finally {
      setLoading(false);
    }
  };

  const current = catalog.find((r) => r.id === selectedId);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Отчёты</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm max-w-3xl">
          Автоматическая выгрузка в Excel. Номера — по одному на строку (используются последние 10 цифр).
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h3 className="text-lg font-semibold">Выбор отчёта</h3>
        <div className="flex flex-wrap gap-2">
          {(catalog.length ? catalog : [{ id: "viktoriya", title: "Viktoriya", description: "" }]).map(
            (r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedId(r.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedId === r.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                }`}
              >
                {r.title}
              </button>
            )
          )}
        </div>
        {current?.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{current.description}</p>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h3 className="text-lg font-semibold">Номера</h3>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder={"77001234567\n7012112875\n…"}
          className="w-full font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
        {lastInfo && <p className="text-green-700 dark:text-green-400 text-sm">{lastInfo}</p>}
        <Button type="button" onClick={runReport} disabled={loading}>
          {loading ? "Формирование…" : "Запустить"}
        </Button>
      </div>
    </div>
  );
};
