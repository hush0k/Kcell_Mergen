import { useEffect, useRef, useState } from "react";
import { api } from "@/api/resources";
import { Button } from "@/components/Button";
import { FaDownload } from "react-icons/fa";
import type { Tele2Response, Tele2LogStatus } from "@/types/api";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<Tele2LogStatus, string> = {
    SUCCESS: "Успешно",
    ERROR: "Ошибка",
    PENDING: "В процессе",
};

const STATUS_BADGE: Record<Tele2LogStatus, string> = {
    SUCCESS: "mg-badge-success",
    ERROR: "mg-badge-danger",
    PENDING: "mg-badge-warning",
};

interface Tele2LogTableProps {
    refreshKey?: number;
}

export function Tele2LogTable({ refreshKey }: Tele2LogTableProps) {
    const [items, setItems] = useState<Tele2Response[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setItems([]);
        setPage(1);
        setHasMore(true);
    }, [refreshKey]);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);

        api.tele2.list({ page, limit: PAGE_SIZE }, { signal: controller.signal })
            .then((res) => {
                setItems((prev) => {
                    if (page === 1) return res.log_list;
                    const seenIds = new Set(prev.map((item) => item.id));
                    return [...prev, ...res.log_list.filter((item) => !seenIds.has(item.id))];
                });
                setHasMore(res.log_list.length === PAGE_SIZE);
            })
            .catch((err) => {
                if (err.name !== "AbortError") {
                    console.error(err);
                    setHasMore(false);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [page, refreshKey]);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && hasMore && !loading) {
                    setPage((p) => p + 1);
                }
            },
            { threshold: 0.1 },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore, loading]);

    const handleDownload = async (log: Tele2Response) => {
        setDownloadingId(log.id);
        try {
            await api.tele2.download(log.id, log.name ?? undefined);
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div className="mg-table-card overflow-auto shrink-0">
            <table className="mg-table w-full">
                <thead>
                <tr>
                    {["Файл", "Статус", "Номера", "Действие"].map((h) => (
                        <th key={h}>{h}</th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {items.map((item) => (
                    <tr key={item.id}>
                        <td className="text-sm whitespace-nowrap">{item.name ?? "—"}</td>
                        <td>
                            <span className={`mg-badge ${STATUS_BADGE[item.status]}`}>
                                {STATUS_LABEL[item.status]}
                            </span>
                        </td>
                        <td className="text-sm text-mg-text-2 max-w-md truncate">{item.numbers.join(", ")}</td>
                        <td>
                            <Button
                                icon={<FaDownload size={14} />}
                                variant="outline"
                                className="w-auto p-2"
                                disabled={item.status !== "SUCCESS" || downloadingId === item.id}
                                onClick={() => handleDownload(item)}
                            />
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