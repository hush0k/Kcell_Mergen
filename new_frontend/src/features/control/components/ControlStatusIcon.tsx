import type { ControlStatus, Frequency } from "@/types/api"

interface ControlStatusProps {
    status: ControlStatus
}

const CONTROL_STATUS_MAP: Record<string, { name: string; color: string; textColor: string }> = {
    ACTIVE:    { name: "Активный",     color: "var(--mg-completed-bg)", textColor: "var(--mg-completed-tx)" },
    SUSPENDED: { name: "Приостановлен", color: "var(--mg-overdue-bg)", textColor: "var(--mg-overdue-tx)" },
}

export function ControlStatusIcon({ status }: ControlStatusProps) {
    const stat = CONTROL_STATUS_MAP[status]
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

export function capitalizeFrequency(frequency: Frequency): string {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1)
}