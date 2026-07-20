import { useState, useEffect, useRef } from "react";
import { TaskWithControl, Task } from "@/types/api";
import { api } from "@/api/resources";
import { StatusIcon } from "@/features/home/components/StatusIcon";
import { Button } from "@/components/Button";
import { BiSolidShow } from "react-icons/bi";
import { BiErrorAlt } from "react-icons/bi";
import { renderTime, calculateTime, diffMinutes } from "@/features/home/hooks/CalulateTime";
import { BsEmojiExpressionless, BsEmojiSmile, BsEmojiGrin, BsEmojiFrown} from "react-icons/bs";

const PAGE_SIZE = 20;

interface Props {
    onTotalChange?: (total: number) => void;
    filters: { status? : string[]; frequency?: string; area?: string[]; user_id?: number; responsible_id?: number };
    search?: string;
    onView: (id:string) => void
}

const columns = [
    { header: "Дата создания", width: "w-[7rem]" },
    { header: "Контроллер", width: "w-[12.5rem]" },
    { header: "Ответственный", width: "w-[8.75rem]" },
    { header: "Исполнитель", width: "w-[8.75rem]" },
    { header: "Статус", width: "w-[6.875rem]" },
    { header: "Комментарий", width: "w-[12.5rem]" },
    { header: "Время", width: "w-[5rem]" },
    { header: "Действия", width: "w-[8rem]" },
]

export function TaskTable({ onTotalChange, filters, search, onView }: Props) {
    const [items, setItems] = useState<TaskWithControl[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        setItems([]);
        setPage(1);
    }, [filters, search]);

    useEffect(() => {
        setLoading(true);
        api.tasks.listWithControls({ page, limit: PAGE_SIZE, ...filters, search }).then(res => {
            if (!mountedRef.current) return;

            setItems(prev => {
                if (page === 1) {
                    return res.task_list;
                }

                const seenIds = new Set(prev.map(item => item.id));
                const nextItems = res.task_list.filter(item => !seenIds.has(item.id));
                return [...prev, ...nextItems];
            });
            setHasMore(res.task_list.length === PAGE_SIZE);
            onTotalChange?.(res.total);
        }).finally(() => {
            if (mountedRef.current) {
                setLoading(false);
            }
        });
    }, [onTotalChange, page, filters, search]);

    const handleComplete = async (id: number) => {
        try {
            const task = await api.tasks.get(id);
            let updated: Task | null = null;

            if (task.status === "NOT_STARTED") {
                updated = await api.tasks.start(id);
            } else if (task.status === "IN_PROGRESS") {
                updated = await api.tasks.complete(id);
            } else if (task.status === "COMPLETED") {
                return;
            } else if (task.status === "OVERDUE") {
                updated = task.start_time != null
                    ? await api.tasks.complete(id)
                    : await api.tasks.start(id);
            }

            if (updated) {
                setItems(prev => prev.map(item =>
                    item.id === id
                        ? { ...item, status: updated.status, start_time: updated.start_time, end_time: updated.end_time }
                        : item
                ));
            }
        } catch (e) {
            console.error(e);
        }
    };


    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && hasMore && !loading) {
                setPage(p => p + 1);
            }
        }, { threshold: 0.1 });
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore, loading]);

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString("ru-RU", {
            day: "2-digit", month: "2-digit", year: "numeric",
        }).replace(/\./g, "-");

    return (
        <div className="mg-table-card overflow-auto max-h-full">
            <table className="w-full border-collapse table-fixed">
                <thead className="sticky top-0 z-10">
                <tr className="bg-mg-surface-2">
                    {columns.map(col => (
                        <th key={col.header} className={`${col.width} px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-mg-text border border-mg-border`}>
                            {col.header}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody style={{ background: "var(--mg-surface)" }}>
                {items.map(item => (
                    <tr
                        key={item.id}
                        className="transition-colors"
                        style={{ borderBottom: "1px solid var(--mg-border)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--mg-surface-2)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "var(--mg-surface)")}
                        onClick={() => onView?.(String(item.id))}
                    >
                        <td className="px-3.5 py-2.5 text-sm whitespace-nowrap">{formatDate(item.created_at)}</td>
                        <td className="px-3.5 py-2.5 text-sm font-bold">
                            <a href={item.control?.dashboard_url} target="_blank" rel="noreferrer" className={"cursor-pointer hover:underline"}>
                                {item.control.name}
                            </a>
                        </td>
                        <td className="px-3.5 py-2.5 text-sm">
                            {item.control.responsible ? (item.control.responsible.is_og ? "ОГ" : `${item.control.responsible.last_name?.[0] ?? "U"}. ${item.control.responsible.first_name ?? "Unknown"}`) : "—"}
                        </td>
                        <td className="px-3.5 py-2.5 text-sm">
                            {item.user
                                ? `${item.user.last_name?.[0] ?? ""}. ${item.user.first_name ?? ""}`
                                : "—"}
                        </td>
                        <td className="px-3.5 py-2.5 w-[90px] text-center">
                            <StatusIcon deadline={item.deadline_time} status={item.status} />
                        </td>
                        <td className="px-3.5 py-2.5 text-sm max-w-[200px] truncate">{item.comments ?? "—"}</td>
                        <td className="px-3.5 py-2.5 text-sm w-[80px] whitespace-nowrap">
                            {item.end_time && item.start_time
                                ? renderTime(calculateTime(diffMinutes(item.start_time, item.end_time)))
                                : "—"}
                        </td>
                        <td className="px-3.5 py-2.5">
                            <div className="flex gap-1.5 " onClick={(e) => e.stopPropagation()}>
                                <Button icon={<BiErrorAlt size={16}/>} variant="outline" className="p-1.5"/>
                                <Button
                                    icon={
                                        item.status === "COMPLETED" ? <BsEmojiGrin size={16} className="text-mg-completed-tx" /> :
                                            item.status === "IN_PROGRESS" ? <BsEmojiSmile size={16} className="text-mg-in-process-tx" /> :
                                                item.status === "NOT_STARTED" ? <BsEmojiExpressionless size={16} className="text-mg-not-started-tx" /> :
                                                    <BsEmojiFrown size={16} className="text-mg-overdue-tx" />
                                    }
                                    variant="outline"
                                    className="p-1.5"
                                    onClick={() => handleComplete(item.id)}
                                />
                                <Button
                                    icon={<BiSolidShow size={16}/>}
                                    variant="outline"
                                    className="p-1.5"
                                    onClick={() => onView?.(String(item.id))}
                                />
                            </div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
            <div ref={sentinelRef} className="h-4" />
            {loading && (
                <div className="py-3 text-center text-sm" style={{ color: "var(--mg-text-3)" }}>
                    Загрузка...
                </div>
            )}
        </div>
    );
}