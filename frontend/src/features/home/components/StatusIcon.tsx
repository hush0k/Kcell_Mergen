import type { TaskStatus } from "@/types/api"

interface StatusProps {
    status: TaskStatus
    deadline: Date | null
}
const STATUS_MAP: Record<string, { name: string; color: string; textColor: string}> = {
    COMPLETED:   { name: "Завершен",   color: "var(--mg-completed-bg)", textColor: "var(--mg-completed-tx)" },
    NOT_STARTED: { name: "Не начат",   color: "var(--mg-not-started-bg)", textColor: "var(--mg-not-started-tx)" },
    OVERDUE:     { name: "Просрочен",  color: "var(--mg-overdue-bg)", textColor: "var(--mg-overdue-tx)" },
    IN_PROGRESS: { name: "В процессе", color: "var(--mg-in-process-bg)", textColor: "var(--mg-in-process-tx)" },
}

export function StatusIcon({ status, deadline }: StatusProps) {
    const upper = status.toUpperCase()
    const isOverdue =
        (upper === "NOT_STARTED") &&
        deadline !== null &&
        new Date(deadline) < new Date()

    const stat = STATUS_MAP[isOverdue ? "OVERDUE" : upper]
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