import type { NumberInformationLogEntry } from "./types"

interface NumberInformationLogTableProps {
    logs: NumberInformationLogEntry[]
}

export function NumberInformationLogTable({ logs }: NumberInformationLogTableProps) {
    if (logs.length === 0) {
        return (
            <div className="mg-table-card flex items-center justify-center py-10">
                <p className="text-mg-text-2 text-sm">Пока нет запросов</p>
            </div>
        )
    }

    return (
        <div className="mg-table-card overflow-x-auto">
            <table className="mg-table w-full">
                <thead>
                    <tr>
                        <th>Время операции</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map((log) => (
                        <tr key={log.id}>
                            <td>{new Date(log.created_at).toLocaleString("ru-RU")}</td>
                            <td>
                                <button
                                    type="button"
                                    className="text-mg-purple text-sm font-semibold hover:underline"
                                    onClick={() => window.open(`/numberInformation/sql/${log.id}`, "_blank")}
                                >
                                    Посмотреть SQL запрос
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
