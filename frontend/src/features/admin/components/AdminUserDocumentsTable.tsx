import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api/resources";
import type { MeNoteResponse, User } from "@/types/api";
import { AccessToggle } from "@/features/admin/components/AccessToggle";
import { isAdminRole, PAGE_SIZE } from "@/features/admin/utils";

interface Props {
    user: User;
    onTotalChange?: (total: number) => void;
}

type AccessField = "read" | "edit";

const columns = [
    { header: "Имя заметки", width: "w-[50%]", align: "text-left" },
    { header: "Может читать", width: "w-[25%]", align: "text-center" },
    { header: "Может редактировать", width: "w-[25%]", align: "text-center" },
];

const hasReadAccess = (note: MeNoteResponse, userId: number) => note.can_read_ids.includes(userId);
const hasEditAccess = (note: MeNoteResponse, userId: number) => note.can_edit_ids.includes(userId);

const sortDocuments = (notes: MeNoteResponse[], userId: number) => {
    return [...notes].sort((a, b) => {
        const aRead = hasReadAccess(a, userId);
        const aEdit = hasEditAccess(a, userId);
        const bRead = hasReadAccess(b, userId);
        const bEdit = hasEditAccess(b, userId);
        const aScore = aRead && aEdit ? 0 : aRead || aEdit ? 1 : 2;
        const bScore = bRead && bEdit ? 0 : bRead || bEdit ? 1 : 2;

        if (aScore !== bScore) return aScore - bScore;
        return (a.name ?? "").localeCompare(b.name ?? "", "ru");
    });
};

const withPermissionIds = (
    note: MeNoteResponse,
    userId: number,
    nextRead: boolean,
    nextEdit: boolean,
) => ({
    ...note,
    can_read_ids: nextRead
        ? Array.from(new Set([...note.can_read_ids, userId]))
        : note.can_read_ids.filter(id => id !== userId),
    can_edit_ids: nextEdit
        ? Array.from(new Set([...note.can_edit_ids, userId]))
        : note.can_edit_ids.filter(id => id !== userId),
});

export function AdminUserDocumentsTable({ user, onTotalChange }: Props) {
    const [items, setItems] = useState<MeNoteResponse[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [pendingKey, setPendingKey] = useState<string | null>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const accessDisabled = isAdminRole(user.role);

    useEffect(() => {
        setItems([]);
        setPage(1);
        setHasMore(true);
    }, [user.id]);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        console.log("first pointer")
        api.meNote.list({ page, per_page: PAGE_SIZE }, { signal: controller.signal })
            .then(res => {
                setItems(prev => {
                    const merged = page === 1
                        ? res.list
                        : [...prev, ...res.list.filter(note => !prev.some(item => item.id === note.id))];
                    console.log("accepted pointer")
                    return sortDocuments(merged, user.id);
                });
                setHasMore(res.list.length === PAGE_SIZE);
                onTotalChange?.(res.total);
            })
            .catch(err => {
                console.log("error pointer");
                if (err.name !== "AbortError") console.error(err);
            })
            .finally(() => {
                console.log("finally");
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [page, user.id, onTotalChange]);

    console.log(items)

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

    const updateNote = useCallback((noteId: number, nextNote: MeNoteResponse) => {
        setItems(prev => prev.map(note => note.id === noteId ? nextNote : note));
    }, []);

    const handleToggle = async (note: MeNoteResponse, field: AccessField) => {
        const currentRead = hasReadAccess(note, user.id);
        const currentEdit = hasEditAccess(note, user.id);
        const nextRead = field === "read" ? !currentRead : currentRead || !currentEdit;
        const nextEdit = field === "edit" ? !currentEdit : currentEdit && !currentRead;
        const optimisticNote = withPermissionIds(note, user.id, nextRead, nextEdit);

        setPendingKey(`${note.id}-${field}`);
        updateNote(note.id, optimisticNote);

        try {
            const updated = field === "read"
                ? nextRead
                    ? await api.meNote.giveReaderRoot(note.id, user.id)
                    : await api.meNote.removeReaderRoot(note.id, user.id)
                : nextEdit
                    ? await api.meNote.giveEditorRoot(note.id, user.id)
                    : await api.meNote.removeEditorRoot(note.id, user.id);

            updateNote(note.id, {
                ...optimisticNote,
                can_read_ids: updated.can_read.map(item => item.id),
                can_edit_ids: updated.can_edit.map(item => item.id),
            });
        } catch (e) {
            console.error(e);
            updateNote(note.id, note);
        } finally {
            setPendingKey(null);
        }
    };

    const empty = useMemo(() => !loading && items.length === 0, [items.length, loading]);

    return (
        <div className="mg-table-card overflow-auto max-h-full">
            <table className="w-full border-collapse table-fixed">
                <thead className="sticky top-0 z-10">
                <tr className="bg-mg-surface-2">
                    {columns.map(col => (
                        <th key={col.header} className={`${col.width} px-3.5 py-3 ${col.align} text-[11px] font-semibold uppercase tracking-wider text-mg-text border border-mg-border`}>
                            {col.header}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody style={{ background: "var(--mg-surface)" }}>
                {items.map(note => {
                    const canRead = hasReadAccess(note, user.id);
                    const canEdit = hasEditAccess(note, user.id);

                    return (
                        <tr
                            key={note.id}
                            className="mg-table-row transition-colors"
                            style={{ borderBottom: "1px solid var(--mg-border)" }}
                        >
                            <td className="px-3.5 py-2.5 text-sm font-semibold truncate">
                                {note.name || "Без названия"}
                            </td>
                            <td className="px-3.5 py-2.5 align-middle">
                                <div className="flex w-full items-center justify-center">
                                <AccessToggle
                                    label={`Доступ на чтение: ${note.name ?? "Без названия"}`}
                                    checked={canRead}
                                    disabled={accessDisabled}
                                    loading={pendingKey === `${note.id}-read`}
                                    onChange={() => handleToggle(note, "read")}
                                />
                                </div>
                            </td>
                            <td className="px-3.5 py-2.5 align-middle">
                                <div className="flex w-full items-center justify-center">
                                <AccessToggle
                                    label={`Доступ на редактирование: ${note.name ?? "Без названия"}`}
                                    checked={canEdit}
                                    disabled={accessDisabled}
                                    loading={pendingKey === `${note.id}-edit`}
                                    onChange={() => handleToggle(note, "edit")}
                                />
                                </div>
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
            {empty && (
                <div className="py-8 text-center text-sm text-mg-text-3">
                    Документы не найдены
                </div>
            )}
            <div ref={sentinelRef} className="h-4" />
            {loading && (
                <div className="py-3 text-center text-sm" style={{ color: "var(--mg-text-3)" }}>
                    Загрузка...
                </div>
            )}
        </div>
    );
}
