import type { IncidentStatus } from "@/types/api"

interface IncidentStatusProps {
    status: IncidentStatus
}

const INCIDENT_STATUS_MAP: Record<string, { name: string; color: string; textColor: string }> = {
    "Открыт":          { name: "Открыт",          color: "var(--mg-overdue-bg)",   textColor: "var(--mg-overdue-tx)" },
    "На согласовании": { name: "На согласовании", color: "var(--mg-pending-bg, var(--mg-overdue-bg))", textColor: "var(--mg-pending-tx, var(--mg-overdue-tx))" },
    "Согласован":      { name: "Согласован",      color: "var(--mg-completed-bg)", textColor: "var(--mg-completed-tx)" },
    "Отклонён":        { name: "Отклонён",        color: "var(--mg-danger-bg)",    textColor: "var(--mg-danger-fg)" },
}

export function IncidentStatusIcon({ status }: IncidentStatusProps) {
    const stat = INCIDENT_STATUS_MAP[status]
    if (!stat) return null
    return (
        <div
            style={{ backgroundColor: stat.color, color: stat.textColor }}
            className="text-xs py-1 rounded-full text-center font-bold"
        >
            <p>{stat.name}</p>
        </div>
    )
}