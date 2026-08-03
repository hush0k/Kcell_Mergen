import { useEffect, useRef, useState } from "react";
import { BiSolidShow } from "react-icons/bi";
import { Button } from "@/components/Button";
import { api } from "@/api/resources";
import type { User } from "@/types/api";
import { formatUserName, PAGE_SIZE } from "@/features/admin/utils";

interface Props {
    onSelectUser: (user: User) => void;
    onTotalChange?: (total: number) => void;
}

const columns = [
    { header: "Пользователь", width: "w-[38%]" },
    { header: "Username", width: "w-[24%]" },
    { header: "UserRole", width: "w-[18%]" },
    { header: "Документы", width: "w-[20%]" },
];

export function AdminUsersTable({ onSelectUser, onTotalChange }: Props) {
    const [items, setItems] = useState<User[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);

        api.users.list({ page, limit: PAGE_SIZE }, { signal: controller.signal })
            .then(list => {
                setItems(prev => {
                    const next = page === 1
                        ? list
                        : [...prev, ...list.filter(user => !prev.some(item => item.id === user.id))];
                    onTotalChange?.(next.length);
                    return next;
                });
                setHasMore(list.length === PAGE_SIZE);
            })
            .catch(err => {
                if (err.name !== "AbortError") console.error(err);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [page, onTotalChange]);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && hasMore && !loading && items.length > 0) {
                setPage(p => p + 1);
            }
        }, { threshold: 0.1 });

        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore, loading, items.length]);

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
                {items.map(user => (
                    <tr
                        key={user.id}
                        className="mg-table-row transition-colors"
                        style={{ borderBottom: "1px solid var(--mg-border)" }}
                    >
                        <td className="px-3.5 py-2.5 text-sm font-semibold truncate">{formatUserName(user)}</td>
                        <td className="px-3.5 py-2.5 text-sm text-mg-text-2 truncate">{user.username}</td>
                        <td className="px-3.5 py-2.5 text-sm">
                            <span className="rounded-full bg-mg-purple-soft px-3 py-1 text-xs font-bold text-mg-purple">
                                {user.role}
                            </span>
                        </td>
                        <td className="px-3.5 py-2.5">
                            <Button
                                icon={<BiSolidShow size={16}/>}
                                text="Подробнее"
                                variant="outline"
                                size="sm"
                                className="w-auto px-3 py-2"
                                onClick={() => onSelectUser(user)}
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
