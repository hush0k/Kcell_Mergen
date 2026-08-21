import { useState, useEffect, useRef } from "react";
import { api } from "@/api/resources";
import { Button } from "@/components/Button";
import { BiSolidShow } from "react-icons/bi";
import type { IncidentResponse, IncidentStatus } from "@/types/api";
import { IncidentStatusIcon } from "@/features/incidents/components/IncidentStatusIcon";

const PAGE_SIZE = 20;

export interface IncidentFilters {
    status?: IncidentStatus;
    case_type?: string;
}

interface Props {
    onTotalChange?: (total: number) => void;
    filters: IncidentFilters;
    search?: string;
    onView: (id: string) => void;
    refreshTrigger?: number;
}

const columns = [
    { header: "Название", width: "w-[24%]" },
    { header: "Тип", width: "w-[14%]" },
    { header: "Дата обнаружения", width: "w-[13%]" },
    { header: "Автор", width: "w-[14%]" },
    { header: "Статус", width: "w-[15%]" },
    { header: "Действие", width: "w-[10%]" },
];

function matchesSearch(item: IncidentResponse, search?: string) {
    if (search) {
        const q = search.toLowerCase();
        const haystack = `${item.incident_name} ${item.description} ${item.username}`.toLowerCase();
        if (!haystack.includes(q)) return false;
    }
    return true;
}

export function IncidentTable({ onTotalChange, filters, search, onView, refreshTrigger }: Props) {
    const [items, setItems] = useState<IncidentResponse[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setItems([]);
        setPage(1);
        setHasMore(true);
    }, [filters, search, refreshTrigger]);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(null);

        api.incidents.list(
            { page, limit: PAGE_SIZE, status: filters.status, case_type: filters.case_type },
            { signal: controller.signal },
        )
            .then(res => {
                setItems(prev => {
                    const next = page === 1 ? res : (() => {
                        const seenIds = new Set(prev.map(item => item.id));
                        return [...prev, ...res.filter(item => !seenIds.has(item.id))];
                    })();
                    return next;
                });
                setHasMore(res.length === PAGE_SIZE);
            })
            .catch(err => {
                if (err.name !== "AbortError") {
                    console.error(err);
                    setError("Не удалось загрузить инциденты. Попробуйте обновить страницу.");
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, refreshTrigger, filters.status, filters.case_type]);

    const visible = items.filter(item => matchesSearch(item, search));

    useEffect(() => {
        onTotalChange?.(visible.length);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, filters, search]);

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
                {visible.map(item => (
                    <tr
                        key={item.id}
                        className="mg-table-row transition-colors"
                        style={{ borderBottom: "1px solid var(--mg-border)" }}
                        onClick={() => onView?.(String(item.id))}
                    >
                        <td className="px-3.5 py-2.5 text-sm">{item.incident_name}</td>
                        <td className="px-3.5 py-2.5 text-sm">{item.case_type}</td>
                        <td className="px-3.5 py-2.5 text-sm">{item.occurrence_date}</td>
                        <td className="px-3.5 py-2.5 text-sm">{item.username}</td>
                        <td className="px-3.5 py-2.5 text-sm"><IncidentStatusIcon status={item.status} /></td>
                        <td className="px-3.5 py-2.5">
                            <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
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
            {error && !loading && (
                <div className="py-3 text-center text-sm text-red-500">
                    {error}
                </div>
            )}
        </div>
    );
}