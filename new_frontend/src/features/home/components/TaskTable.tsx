import { useState, useEffect, useRef } from "react";
import { TaskWithControl } from "@/types/api";
import { api } from "@/api/resources";
import { StatusIcon } from "@/features/home/components/StatusIcon";
import { Button } from "@/components/Button";
import { FaCheck } from "react-icons/fa";
import { BiSolidMessageAltError, BiSolidShow } from "react-icons/bi";

const PAGE_SIZE = 20;

interface Props {
    onTotalChange?: (total: number) => void;
}

export function TaskTable({ onTotalChange }: Props) {
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
        setLoading(true);
        api.tasks.listWithControls({ page, limit: PAGE_SIZE }).then(res => {
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
    }, [onTotalChange, page]);

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
            <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10">
                <tr style={{ background: "var(--mg-surface-3)" }}>
                    {["Дата создания", "Контроллер", "Ответственный", "Исполнитель", "Статус", "Комментарий", "Время", "Действия"].map(h => (
                        <th
                            key={h}
                            className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                            style={{ color: "var(--mg-text)", borderBottom: "1px solid var(--mg-border)" }}
                        >
                            {h}
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
                    >
                        <td className="px-3.5 py-2.5 text-sm whitespace-nowrap">{formatDate(item.created_at)}</td>
                        <td className="px-3.5 py-2.5 text-sm">
                            <a href={item.control.dashboard_url} target="_blank" rel="noreferrer">
                                {item.control.name}
                            </a>
                        </td>
                        <td className="px-3.5 py-2.5 text-sm">
                            {item.user ? `${item.user.last_name[0]}.${item.user.first_name}` : "—"} 
                        </td>
                        <td className="px-3.5 py-2.5 text-sm">
                            {item.user ? `${item.user.last_name[0]}.${item.user.first_name}` : "—"}
                        </td>
                        <td className="px-3.5 py-2.5 w-[90px] text-center">
                            <StatusIcon deadline={item.deadline_time} status={item.status} />
                        </td>
                        <td className="px-3.5 py-2.5 text-sm max-w-[200px] truncate">{item.comments ?? "—"}</td>
                        <td className="px-3.5 py-2.5 text-sm w-[80px] whitespace-nowrap">
                            {item.control.time_estimate ?? "—"}
                        </td>
                        <td className="px-3.5 py-2.5">
                            <div className="flex gap-1.5">
                                <Button icon={<BiSolidMessageAltError />} variant="outline" />
                                <Button icon={<FaCheck />} variant="outline" />
                                <Button icon={<BiSolidShow />} variant="outline" />
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
