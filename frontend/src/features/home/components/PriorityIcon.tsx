interface PriorityProps {
    priority: string | null;
}

const PRIORITY_MAP: Record<number, { name: string; color: string; textColor: string }> = {
    "1": { name: "Низкий",  color: "var(--mg-completed-bg)",  textColor: "var(--mg-completed-tx)" },
    "2": { name: "Средний", color: "var(--mg-in-process-bg)", textColor: "var(--mg-in-process-tx)" },
    "3": { name: "Высокий", color: "var(--mg-overdue-bg)",    textColor: "var(--mg-overdue-tx)" },
}

export function PriorityIcon({ priority }: PriorityProps) {
    // @ts-ignore
    const p = PRIORITY_MAP[priority]
    if (!p) return null
    return (
        <div
            style={{ backgroundColor: p.color, color: p.textColor }}
            className="text-xs py-1 rounded-full text-center font-bold"
        >
            <p>{p.name}</p>
        </div>
    )
}