import { Fragment } from "react";

type MfsStatus =
    | "blocked"
    | "not_blocked"
    | "already_blocked"
    | "unblocked"
    | "not_found"
    | "error";

interface MfsResultRow {
    msisdn: string;
    status: MfsStatus;
    message: string;
}

export interface MfsActionResult {
    action: string;
    results: MfsResultRow[];
    summary: { total: number; ok: number; skipped: number; error: number };
}

const STATUS_LABEL: Record<MfsStatus, string> = {
    blocked: "Заблокирован",
    not_blocked: "Не заблокирован",
    already_blocked: "Уже заблокирован",
    unblocked: "Разблокирован",
    not_found: "Не найден",
    error: "Ошибка",
};

const STATUS_BADGE: Record<MfsStatus, string> = {
    blocked: "mg-badge-danger",
    not_blocked: "mg-badge-success",
    already_blocked: "mg-badge-warning",
    unblocked: "mg-badge-success",
    not_found: "mg-badge-warning",
    error: "mg-badge-danger",
};

interface BlackListResultProps {
    result: MfsActionResult | null;
}

export function BlackListResult({ result }: BlackListResultProps) {
    if (!result) return null;

    const { total, ok, skipped, error } = result.summary;

    return (
        <div className="mg-panel p-6 space-y-4">
            <div>
                <h2 className="mg-section-title">Результат blacklist</h2>
                <p className="text-sm text-mg-text-2 mt-1">
                    Всего: {total} · ОК: {ok} · Пропущено: {skipped} · Ошибок: {error}
                </p>
            </div>

            <div className="mg-table-card overflow-auto">
                <table className="mg-table w-full">
                    <thead>
                    <tr>
                        {["Номер", "Статус", "Комментарий"].map(h => (
                            <th key={h}>{h}</th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {result.results.map((row, i) => (
                        <Fragment key={row.msisdn + i}>
                            <tr>
                                <td className="text-sm whitespace-nowrap">{row.msisdn}</td>
                                <td>
                                    <span className={`mg-badge ${STATUS_BADGE[row.status]}`}>
                                        {STATUS_LABEL[row.status]}
                                    </span>
                                </td>
                                <td className="text-sm text-mg-text-2">{row.message}</td>
                            </tr>
                        </Fragment>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}