import React, { useCallback, useEffect, useState } from "react";
import { Button } from "../components/Button";

type MfsAction = "block" | "unblock" | "check";
type NoteMode = "add" | "delete";
type NoteTemplateId = "restriction_full" | "restriction_short";

interface MfsResultRow {
  msisdn: string;
  status: string;
  message?: string;
  clnt_id?: number | null;
  http_status?: number | null;
}

interface MfsSummary {
  total: number;
  ok: number;
  skipped: number;
  error: number;
}

interface NoteTemplate {
  id: NoteTemplateId;
  label: string;
  preview: string;
}

interface AuditRow {
  id: number;
  username: string;
  action: string;
  msisdns_text: string;
  summary: { ok: number; skipped: number; error: number };
  created_at: string | null;
}

const ACTION_LABELS: Record<MfsAction, string> = {
  block: "Заблокировать номера",
  unblock: "Разблокировать номера",
  check: "Проверить номера (на блок)",
};

const STATUS_RU: Record<string, string> = {
  blocked: "Заблокирован",
  unblocked: "Разблокирован",
  already_blocked: "Уже в списке",
  not_found: "Нет в списке",
  not_blocked: "Не заблокирован",
  error: "Ошибка",
  ok: "OK",
  no_client: "Клиент не найден",
};

const DEFAULT_TEMPLATES: NoteTemplate[] = [
  {
    id: "restriction_full",
    label: "Полное (п. 4.2.3)",
    preview: "ПО НОМЕРУ БЫЛО УСТАНОВЛЕНО ОГРАНИЧЕНИЕ…",
  },
  {
    id: "restriction_short",
    label: "Краткое (ограничение МФС)",
    preview: "На абонентском номере ограничен доступ к сервису МФС…",
  },
];

function ResultsTable({ rows, showClnt }: { rows: MfsResultRow[]; showClnt?: boolean }) {
  return (
    <div className="overflow-x-auto max-h-80 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-600 text-left">
              <th className="py-2 pr-4">Номер</th>
              {showClnt && <th className="py-2 pr-4">clnt_id</th>}
              <th className="py-2 pr-4">Статус</th>
              <th className="py-2">Комментарий</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={`${r.msisdn}-${r.clnt_id ?? ""}-${r.status}`}
                className="border-b border-gray-100 dark:border-gray-700"
              >
                <td className="py-2 pr-4 font-mono">{r.msisdn}</td>
                {showClnt && (
                  <td className="py-2 pr-4 font-mono text-xs">{r.clnt_id ?? "—"}</td>
                )}
                <td className="py-2 pr-4">{STATUS_RU[r.status] || r.status}</td>
                <td className="py-2 text-gray-600 dark:text-gray-400">{r.message || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
  );
}

export const Mfs: React.FC = () => {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [configHint, setConfigHint] = useState<string | null>(null);
  const [atlasConfigured, setAtlasConfigured] = useState<boolean | null>(null);
  const [atlasHint, setAtlasHint] = useState<string | null>(null);
  const [noteTemplates, setNoteTemplates] = useState<NoteTemplate[]>([]);

  const [action, setAction] = useState<MfsAction>("check");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<MfsResultRow[] | null>(null);
  const [summary, setSummary] = useState<MfsSummary | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);

  const [noteMode, setNoteMode] = useState<NoteMode>("add");
  const [noteTemplate, setNoteTemplate] = useState<NoteTemplateId>("restriction_full");
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteResults, setNoteResults] = useState<MfsResultRow[] | null>(null);
  const [noteSummary, setNoteSummary] = useState<MfsSummary | null>(null);

  const apiHeaders = (json = false): HeadersInit => {
    const token = localStorage.getItem("token");
    const h: HeadersInit = {};
    if (token) {
      h.Authorization = `Bearer ${token}`;
    }
    if (json) {
      h["Content-Type"] = "application/json";
    }
    return h;
  };

  const handleAuthError = (res: Response, data: { msg?: string; detail?: string }) => {
    if (res.status === 401 || res.status === 422) {
      setError(
        data.msg ||
          "Сессия недействительна (часто после смены .env или входа на другом порту). Выйдите и войдите снова на :5000."
      );
      return true;
    }
    return false;
  };

  const parseApiError = (data: { msg?: string; detail?: string; hint?: string }) => {
    const parts = [data.msg, data.detail, data.hint].filter(Boolean);
    return parts.join(" — ") || "Ошибка операции";
  };

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/mfs/status", { headers: apiHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (handleAuthError(res, data)) {
          setConfigured(false);
          setAtlasConfigured(false);
          return;
        }
        setConfigured(false);
        setConfigHint(data.msg || "Ошибка проверки МФС");
        return;
      }
      setConfigured(!!data.configured);
      setConfigHint(data.hint || null);
      setAtlasConfigured(!!data.atlas_configured);
      setAtlasHint(data.atlas_hint || null);
      if (Array.isArray(data.note_templates)) {
        setNoteTemplates(data.note_templates);
      }
    } catch {
      setConfigured(false);
      setAtlasConfigured(false);
      setConfigHint("Не удалось проверить настройку");
    }
  }, []);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch("/api/mfs/audit?limit=30", { headers: apiHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (handleAuthError(res, data)) return;
        setError(parseApiError(data));
        return;
      }
      setAudit(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    loadAudit();
  }, [loadStatus, loadAudit]);

  const runAction = async () => {
    setError("");
    setResults(null);
    setSummary(null);
    if (!text.trim()) {
      setError("Вставьте номера — по одному на строку");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/mfs/action", {
        method: "POST",
        headers: apiHeaders(true),
        body: JSON.stringify({ action, msisdns: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (handleAuthError(res, data)) return;
        setError(parseApiError(data));
        return;
      }
      setResults(data.results || []);
      setSummary(data.summary || null);
      if (data.audit_warning) {
        setError(String(data.audit_warning));
      }
      loadAudit();
    } catch {
      setError("Ошибка сети или сервера");
    } finally {
      setLoading(false);
    }
  };

  const runAtlasNote = async () => {
    setError("");
    setNoteResults(null);
    setNoteSummary(null);
    if (!text.trim()) {
      setError("Вставьте номера — по одному на строку");
      return;
    }
    setNoteLoading(true);
    try {
      const res = await fetch("/api/mfs/atlas-note", {
        method: "POST",
        headers: apiHeaders(true),
        body: JSON.stringify({
          mode: noteMode,
          template: noteTemplate,
          msisdns: text,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (handleAuthError(res, data)) return;
        setError(parseApiError(data));
        return;
      }
      setNoteResults(data.results || []);
      setNoteSummary(data.summary || null);
      if (data.audit_warning) {
        setError(String(data.audit_warning));
      }
      loadAudit();
    } catch {
      setError("Ошибка сети или сервера");
    } finally {
      setNoteLoading(false);
    }
  };

  const actionLabel = (a: string) => {
    const map: Record<string, string> = {
      block: "Блокировка",
      unblock: "Разблокировка",
      check: "Проверка",
      note_add_full: "Комментарий (полный)",
      note_add_short: "Комментарий (краткий)",
      note_delete: "Удаление комментария",
    };
    return map[a] || a;
  };

  const templates = noteTemplates.length ? noteTemplates : DEFAULT_TEMPLATES;

  return (
    <div className="space-y-8">
      
        <h2 className="text-2xl font-bold mb-2">МФС — чёрный список и комментарии Atlas</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm max-w-3xl">
          Номера — по одному на строку (последние 10 цифр, префикс 7).
        </p>

      {configured === false && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100">
          <p className="font-medium">База blacklist не подключена</p>
          <p className="text-sm mt-1">
            {configHint || "Заполните MFS_PG_* в Kcell_mergen/.env и перезапустите :5000."}
          </p>
        </div>
      )}

      {atlasConfigured === false && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100">
          <p className="font-medium">Atlas (комментарии) не настроен</p>
          <p className="text-sm mt-1">
            {atlasHint || "Задайте ATLAS_USER и ATLAS_PASSWORD в Kcell_mergen/.env."}
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-3">Номера (общее поле)</h3>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={"77001234567\n7012112875\n…"}
          className="w-full font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h3 className="text-lg font-semibold">Чёрный список (blacklist)</h3>
        <div className="flex flex-wrap gap-2">
          {(["check", "block", "unblock"] as MfsAction[]).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAction(a)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                action === a
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {ACTION_LABELS[a]}
            </button>
          ))}
        </div>
        <Button
          type="button"
          onClick={runAction}
          disabled={loading || configured === false}
          variant={action === "unblock" ? "secondary" : action === "block" ? "danger" : "primary"}
        >
          {loading ? "Выполняется…" : ACTION_LABELS[action]}
        </Button>
      </div>

      {summary && results && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold mb-2">Результат blacklist</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Всего: {summary.total} · OK: {summary.ok} · Пропущено: {summary.skipped} · Ошибок:{" "}
            {summary.error}
          </p>
          <ResultsTable rows={results} />
        </div>
      )}

      
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h3 className="text-lg font-semibold">Комментарий в Atlas (CODA)</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Добавление — выбранный шаблон заметки. Удаление — текст «.».
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setNoteMode("add")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                noteMode === "add"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
              }`}
            >
              Добавить комментарий
            </button>
            <button
              type="button"
              onClick={() => setNoteMode("delete")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                noteMode === "delete"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
              }`}
            >
              Удалить комментарий
            </button>
          </div>

          {noteMode === "add" && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Шаблон текста</p>
              
                {templates.map((t) => (
                  <label
                    key={t.id}
                    className={`flex gap-3 p-3 mb-2 rounded-lg border cursor-pointer ${
                      noteTemplate === t.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="noteTemplate"
                      checked={noteTemplate === t.id}
                      onChange={() => setNoteTemplate(t.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium block">{t.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{t.preview}</span>
                    </span>
                  </label>
                ))}
            </div>
          )}

          <Button
            type="button"
            onClick={runAtlasNote}
            disabled={noteLoading || atlasConfigured === false}
            variant={noteMode === "delete" ? "danger" : "primary"}
          >
            {noteLoading
              ? "Выполняется…"
              : noteMode === "delete"
                ? "Удалить комментарии"
                : "Добавить комментарии"}
          </Button>
        </div>

      {noteSummary && noteResults && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold mb-2">Результат Atlas</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Всего: {noteSummary.total} · OK: {noteSummary.ok} · Без клиента: {noteSummary.skipped} ·
            Ошибок: {noteSummary.error}
          </p>
          <ResultsTable rows={noteResults} showClnt />
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4">Журнал операций</h3>
        {auditLoading ? (
          <p className="text-gray-500">Загрузка…</p>
        ) : audit.length === 0 ? (
          <p className="text-gray-500">Записей пока нет</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-600 text-left">
                  <th className="py-2 pr-3">Дата</th>
                  <th className="py-2 pr-3">Пользователь</th>
                  <th className="py-2 pr-3">Действие</th>
                  <th className="py-2 pr-3">Итог</th>
                  <th className="py-2">Номера</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700 align-top">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {row.created_at
                        ? new Date(row.created_at).toLocaleString("ru-RU")
                        : "—"}
                    </td>
                    <td className="py-2 pr-3">{row.username}</td>
                    <td className="py-2 pr-3">{actionLabel(row.action)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      OK {row.summary?.ok ?? 0} / проп. {row.summary?.skipped ?? 0} / ош.{" "}
                      {row.summary?.error ?? 0}
                    </td>
                    <td className="py-2 font-mono text-xs max-w-md truncate" title={row.msisdns_text}>
                      {row.msisdns_text.replace(/\n/g, ", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
