import { useEffect, useState } from "react";
import { api } from "@/api/resources";

type Action =
    | "BLOCK"
    | "UNBLOCK"
    | "CHECK"
    | "NOTE_ADD_FULL"
    | "NOTE_ADD_SHORT"
    | "NOTE_DELETE";

type LogEntry = {
    id: number;
    date: string;
    user: string;
    action: Action;
    ok: number;
    skipped: number;
    error: number;
    numbers: string[];
};

const ACTION_LABEL: Record<Action, string> = {
    BLOCK: "Блокировка",
    UNBLOCK: "Разблокировка",
    CHECK: "Проверка",
    NOTE_ADD_FULL: "Комментарий (полный)",
    NOTE_ADD_SHORT: "Комментарий (краткий)",
    NOTE_DELETE: "Удаление комментария",
};

const ACTION_STYLE: Record<Action, string> = {
    BLOCK: "bg-mg-danger-bg text-mg-danger-fg",
    UNBLOCK: "bg-mg-success-bg text-mg-lime",
    CHECK: "bg-mg-info-bg text-mg-info-fg",
    NOTE_ADD_FULL: "bg-mg-purple-soft-2 text-mg-purple",
    NOTE_ADD_SHORT: "bg-mg-purple-soft-2 text-mg-purple",
    NOTE_DELETE: "bg-mg-danger-bg text-mg-danger-fg",
};

function ActionBadge({ action }: { action: Action }) {
    return (
        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${ACTION_STYLE[action]}`}>
             {ACTION_LABEL[action]}
        </span>
    );
}

interface OperationsLogProps {
    refreshKey?: number;
}

export function OperationsLog({ refreshKey }: OperationsLogProps) {
    const [items, setItems] = useState<LogEntry[]>([]);

    useEffect(() => {
        let cancelled = false;

        api.mfs.list().then((data) => {
            if (cancelled) return;
            const records = data as unknown as Array<{
                id: number;
                username: string;
                action: Action;
                msisdns_text: string;
                summary_ok: number;
                summary_skipped: number;
                summary_error: number;
                created_at: string;
            }>;

            setItems(
                records.map((r) => ({
                    id: r.id,
                    date: new Date(r.created_at).toLocaleString("ru-RU"),
                    user: r.username,
                    action: r.action,
                    ok: r.summary_ok,
                    skipped: r.summary_skipped,
                    error: r.summary_error,
                    numbers: r.msisdns_text.split("\n").filter(Boolean),
                })),
            );
        });

        return () => {
            cancelled = true;
        };
    }, [refreshKey]);

    return (
        <div className="mg-table-card overflow-auto shrink-0 ">
            <table className="mg-table w-full">
                <thead>
                <tr>
                    {["Дата", "Пользователь", "Действие", "Итог", "Номера"].map(h => (
                        <th key={h}>{h}</th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {items.map(item => (
                    <tr key={item.id}>
                        <td className="whitespace-nowrap text-sm">{item.date}</td>
                        <td className="text-sm">{item.user}</td>
                        <td><ActionBadge action={item.action} /></td>
                        <td className="text-sm text-mg-text-2 whitespace-nowrap">
                            ОК {item.ok} / проп. {item.skipped} / ош. {item.error}
                        </td>
                        <td className="text-sm text-mg-text-2 max-w-md truncate">
                            {item.numbers.join(", ")}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    )
}
