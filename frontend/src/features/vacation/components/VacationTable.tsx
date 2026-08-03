import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/api/client";
import { apiEndpoints } from "@/api/endpoints";
import { Button } from "@/components/Button";
import type { VacationScheduleList, VacationScheduleWithUser, VacationStatus, VacationType } from "@/types/vacation";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { getVacationStatusLabel, getVacationTypeLabel } from "@/features/vacation/components/vacationOptions";

const PAGE_SIZE = 20;

export interface VacationFilters {
    status?: VacationStatus;
    vacation_type?: VacationType;
}

interface Props {
    onTotalChange?: (total: number) => void;
    filters: VacationFilters;
    search?: string;
    onEdit: (id: number) => void;
    onDelete: (vacation: VacationScheduleWithUser) => void;
    refreshTrigger?: number;
    isAdmin?: boolean;
}

const baseColumns = [
    { header: "Сотрудник", width: "w-[24%]" },
    { header: "Тип", width: "w-[18%]" },
    { header: "Дата начало", width: "w-[14%]" },
    { header: "Дата окончание", width: "w-[14%]" },
    { header: "Статус", width: "w-[12%]" },
];

const actionColumn = { header: "Действии", width: "w-[12%]" };

const formatUser = (item: VacationScheduleWithUser) => {
    if (!item.user) return "Не назначен";
    if (item.user.is_og) return "ОГ";
    const name = `${item.user.last_name ?? ""} ${item.user.first_name ?? ""}`.trim();
    return name || item.user.username;
};

const formatDate = (value: string) => value.split("-").reverse().join(".");

const listVacations = (
    params: VacationFilters & { page: number; limit: number; search?: string },
    signal?: AbortSignal,
) => {
    const searchParams = new URLSearchParams();
    searchParams.set("page", String(params.page));
    searchParams.set("limit", String(params.limit));
    if (params.status) searchParams.set("status", params.status);
    if (params.vacation_type) searchParams.set("vacation_type", params.vacation_type);
    if (params.search) searchParams.set("search", params.search);

    return apiRequest<VacationScheduleList>(
        `${apiEndpoints.vacationSchedule.root}?${searchParams.toString()}`,
        { signal },
    );
};

export function VacationTable({ onTotalChange, filters, search, onEdit, onDelete, refreshTrigger, isAdmin }: Props) {
    const columns = isAdmin ? [...baseColumns, actionColumn] : baseColumns;
    const [items, setItems] = useState<VacationScheduleWithUser[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setItems([]);
        setPage(1);
    }, [filters, search, refreshTrigger]);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);

        listVacations({ page, limit: PAGE_SIZE, ...filters, search }, controller.signal)
            .then(res => {
                setItems(prev => {
                    if (page === 1) return res.vacations;
                    const seenIds = new Set(prev.map(item => item.id));
                    return [...prev, ...res.vacations.filter(item => !seenIds.has(item.id))];
                });
                setHasMore(res.vacations.length === PAGE_SIZE);
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
                    >
                        <td className="px-3.5 py-2.5 text-sm truncate">{formatUser(item)}</td>
                        <td className="px-3.5 py-2.5 text-sm">{getVacationTypeLabel(item.vacation_type)}</td>
                        <td className="px-3.5 py-2.5 text-sm">{formatDate(item.start_date)}</td>
                        <td className="px-3.5 py-2.5 text-sm">{formatDate(item.end_date)}</td>
                        <td className="px-3.5 py-2.5 text-sm">
                            <div
                                className="text-xs py-1 rounded-full text-center font-bold"
                                style={{
                                    backgroundColor: item.status === "ACTIVE" ? "var(--mg-completed-bg)" : "var(--mg-overdue-bg)",
                                    color: item.status === "ACTIVE" ? "var(--mg-completed-tx)" : "var(--mg-overdue-tx)",
                                }}
                            >
                                {getVacationStatusLabel(item.status)}
                            </div>
                        </td>
                        {isAdmin && (
                            <td className="px-3.5 py-2.5">
                                <div className="flex gap-1.5">
                                    <Button
                                        icon={<FiEdit2 size={16}/>}
                                        variant="outline"
                                        className="p-1.5"
                                        onClick={() => onEdit(item.id)}
                                    />
                                    <Button
                                        icon={<FiTrash2 size={16}/>}
                                        variant="danger"
                                        className="p-1.5 border"
                                        onClick={() => onDelete(item)}
                                    />
                                </div>
                            </td>
                        )}
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
