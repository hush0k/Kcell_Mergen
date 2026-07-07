import { useState, useEffect, useRef } from "react";
import { api } from "@/api/resources";
import { Button } from "@/components/Button";
import { BiSolidShow } from "react-icons/bi";
import { MdSwapHoriz } from "react-icons/md";
import type { ControlWithUsers, ControlStatus, Frequency } from "@/types/api";
import { ControlStatusIcon, capitalizeFrequency } from "@/features/control/components/ControlStatusIcon";

const PAGE_SIZE = 20;

export interface ControlFilters {
    area?: string;
    control_status?: ControlStatus;
    frequency?: Frequency;
    responsible_id?: number;
}

interface Props {
    onTotalChange?: (total: number) => void;
    filters: ControlFilters;
    search?: string;
    onView: (id: string) => void;
    refreshTrigger?: number;
}

const columns = [
    { header: "Область", width: "w-[8%]" },
    { header: "Название", width: "w-[22%]" },
    { header: "Частота", width: "w-[15%]" },
    { header: "Ответственный", width: "w-[15%]" },
    { header: "Статус", width: "w-[9%]" },
    { header: "Действие", width: "w-[10%]" },
];

export function ControlTable({ onTotalChange, filters, search, onView, refreshTrigger }: Props) {
    const [items, setItems] = useState<ControlWithUsers[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setItems([]);
        setPage(1);
    }, [filters, search]);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);

        api.controls.list({ page, per_page: PAGE_SIZE, ...filters, search }, { signal: controller.signal })
            .then(res => {
                setItems(prev => {
                    if (page === 1) return res.controls;
                    const seenIds = new Set(prev.map(item => item.id));
                    return [...prev, ...res.controls.filter(item => !seenIds.has(item.id))];
                });
                setHasMore(res.controls.length === PAGE_SIZE);
                onTotalChange?.(res.total);
            })
            .catch(err => {
                if (err.name !== "AbortError") console.error(err);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [page, filters, search, refreshTrigger]);

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

    const handleChangeStatus = async (id: number) => {
        const prevItems = items;
        setItems(prev => prev.map(item =>
            item.id === id
                ? { ...item, status: item.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }
                : item
        ));
        try {
            await api.controls.changeStatus(id);
        } catch (e) {
            console.error(e);
            setItems(prevItems);
        }
    };

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
                        className="mg-table-row transition-colors"
                        style={{ borderBottom: "1px solid var(--mg-border)" }}
                        onClick={() => onView?.(String(item.id))}
                    >
                        <td className="px-3.5 py-2.5 text-sm">{item.area}</td>
                        <td className="px-3.5 py-2.5 text-sm">
                            {item.dashboard_url ? (
                                <a href={item.dashboard_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                                    {item.name}
                                </a>
                            ) : item.name}
                        </td>
                        <td className="px-3.5 py-2.5 text-sm">{capitalizeFrequency(item.frequency)}</td>
                        <td className="px-3.5 py-2.5 text-sm">
                            {item.responsible
                                ? item.responsible.is_og
                                    ? "ОГ"
                                    : `${item.responsible.last_name?.[0] ?? ""}. ${item.responsible.first_name ?? ""}`
                                : "—"}
                        </td>
                        <td className="px-3.5 py-2.5 text-sm"><ControlStatusIcon status={item.status} /></td>
                        <td className="px-3.5 py-2.5">
                            <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                                <Button
                                    icon={<BiSolidShow size={16}/>}
                                    variant="outline"
                                    className="p-1.5"
                                    onClick={() => onView?.(String(item.id))}
                                />
                                <Button
                                    icon={<MdSwapHoriz size={16}/>}
                                    variant="outline"
                                    className="p-1.5"
                                    onClick={() => handleChangeStatus(item.id)}
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