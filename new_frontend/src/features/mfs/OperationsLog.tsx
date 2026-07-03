import { useState } from "react";

type Action = "check" | "unblock";

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
    check: "Проверка",
    unblock: "Разблокировка",
};

const MOCK_DATA: LogEntry[] = [
    { id: 1, date: "01.07.2026, 13:21:58", user: "Karlygash", action: "check", ok: 1, skipped: 0, error: 0, numbers: ["77753911722"] },
    { id: 2, date: "30.06.2026, 07:38:20", user: "Viktoriya", action: "check", ok: 20, skipped: 0, error: 0, numbers: ["77077275353", "77023525513", "77011419704", "77751820..."] },
    { id: 3, date: "29.06.2026, 10:56:02", user: "Karlygash", action: "check", ok: 1, skipped: 0, error: 0, numbers: ["77016741131"] },
    { id: 4, date: "29.06.2026, 10:55:59", user: "Karlygash", action: "unblock", ok: 0, skipped: 1, error: 0, numbers: ["77016741131"] },
    { id: 5, date: "29.06.2026, 10:55:55", user: "Karlygash", action: "check", ok: 1, skipped: 0, error: 0, numbers: ["77016741131"] },
];

function ActionBadge({ action }: { action: Action }) {
    const styles =
        action === "check"
            ? "bg-mg-blue-soft text-mg-blue"
            : "bg-mg-green-soft text-mg-green";
    return (
        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${styles}`}>
            {ACTION_LABEL[action]}
        </span>
    );
}

export function OperationsLog({ data = MOCK_DATA }: { data?: LogEntry[] }) {
    const [items] = useState<LogEntry[]>(data);

    return (
        <div className="mg-table-card overflow-auto">
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