import { useEffect, useState, useRef } from "react";
import { useNoteSelection } from "@/contexts/NoteSelectionContext";
import { EditMod, type EditModHandle } from "@/features/note_home/components/EditMod";
import type { NoteStats } from "@/features/note_home/components/EditMod";
import { ViewMod } from "@/features/note_home/components/ViewMod";
import { EmptyNoteState } from "@/features/note_home/components/EmptyNoteState";
import { NoAccessState } from "@/features/note_home/components/NoAccessState";
import { PeopleSettings } from "@/features/note_home/components/PeopleSettings";
import { AttachmentsPanel } from "@/features/note_home/components/AttachmentsPanel";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { RiEdit2Fill, RiSaveLine } from "react-icons/ri";
import { MdDeleteOutline } from "react-icons/md";
import { LuHistory } from "react-icons/lu";
import { api } from "@/api/resources";
import { ApiError } from "@/api/client";
import { meNoteSocket } from "@/api/me-note-ws-client";
import { IoMdSettings } from "react-icons/io";
import type { CurrentUser, MeNoteAccessDeniedDetail, MeNoteWithAll, UserBrief } from "@/types/api";

const LOCK_TTL_MS = 1 * 60 * 1000;

function formatUserName(user: UserBrief): string {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
    return fullName || user.username;
}

function formatDateTime(value: string): string {
    const date = new Date(value);
    return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function MergenNoteMainPage() {
    const { selectedFileId, setSelectedFileId, triggerRefresh } = useNoteSelection();
    const [isEditing, setIsEditing] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [stats, setStats] = useState<NoteStats | null>(null);
    const [note, setNote] = useState<MeNoteWithAll | null>(null);
    const [lockedByOther, setLockedByOther] = useState(false);
    const [accessDenied, setAccessDenied] = useState<MeNoteAccessDeniedDetail | null>(null);
    const [isPeopleSettingsOpen, setIsPeopleSettingsOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const editModRef = useRef<EditModHandle>(null);

    useEffect(() => {
        api.auth.me().then(setCurrentUser).catch((e) => console.error(e));
    }, []);

    const handleDelete = async () => {
        if (!selectedFileId) return;
        setDeleting(true);
        try {
            await api.meNote.deleteMany([selectedFileId]);
            setDeleteOpen(false);
            setSelectedFileId(null);
            triggerRefresh();
        } catch (e) {
            console.error(e);
        } finally {
            setDeleting(false);
        }
    };

    const handleSave = () => {
        if (!isEditing && lockedByOther) return;

        if (isEditing) {
            editModRef.current?.saveVersion();
        }
        setIsEditing(!isEditing);
    };

    const handleRestoreLastVersion = () => {
        editModRef.current?.restoreLastVersion();
    };

    useEffect(() => {
        meNoteSocket.connect();
        return () => meNoteSocket.disconnect();
    }, []);

    useEffect(() => {
        const handler = (e: Event) => {
            const { noteId } = (e as CustomEvent<{ noteId: number }>).detail;
            setIsEditing(false);
            setSelectedFileId(noteId);
        };
        window.addEventListener('wikilink-navigate', handler);
        return () => window.removeEventListener('wikilink-navigate', handler);
    }, [setSelectedFileId]);

    useEffect(() => {
        if (!selectedFileId) {
            setNote(null);
            setIsEditing(false);
            setLockedByOther(false);
            setAccessDenied(null);
            return;
        }

        setAccessDenied(null);
        const controller = new AbortController();
        api.meNote.get(selectedFileId, { signal: controller.signal })
            .then((data) => {
                setNote(data);
                setLockedByOther(data.is_editing);
                setIsEditing(false);
            })
            .catch((err) => {
                if (err.name === "AbortError") return;
                if (err instanceof ApiError && err.status === 403) {
                    const detail = err.payload as { detail?: MeNoteAccessDeniedDetail };
                    setAccessDenied(detail?.detail ?? null);
                    return;
                }
                console.error(err);
            });

        return () => controller.abort();
    }, [selectedFileId]);

    useEffect(() => {
        if (!selectedFileId) return;

        return meNoteSocket.subscribe((message) => {
            if (message.note_id !== selectedFileId) return;

            api.meNote.get(selectedFileId)
                .then((data) => {
                    setNote(data);
                    setLockedByOther(data.is_editing);
                })
                .catch((err) => console.error(err));
        });
    }, [selectedFileId]);

    useEffect(() => {
        if (!lockedByOther || !note?.editing_started_at) return;

        const startedAt = new Date(note.editing_started_at).getTime();
        const remaining = startedAt + LOCK_TTL_MS - Date.now();

        if (remaining <= 0) {
            setLockedByOther(false);
            return;
        }

        const timeout = setTimeout(() => setLockedByOther(false), remaining);
        return () => clearTimeout(timeout);
    }, [lockedByOther, note?.editing_started_at]);

    return (
        <div className={"bg-nt-surface m-0 p-0 h-screen w-full flex flex-col"}>
            {selectedFileId && !accessDenied && (
                <div className="flex flex-row justify-end space-x-10 px-6 py-3 pb-10 shrink-0">
                    <Button
                        icon={<IoMdSettings size={20}/>}
                        variant={"outline"}
                        className={"w-auto px-3"}
                        size={"md"}
                        onClick={() => setIsPeopleSettingsOpen(true)}
                    />
                    <Button
                        icon={isEditing ? <RiSaveLine /> : <RiEdit2Fill />}
                        text={isEditing ? "Сохранить" : "Редактировать"}
                        className="w-auto"
                        disabled={!isEditing && lockedByOther}
                        onClick={handleSave}
                    />
                    {isEditing && (
                        <Button
                            icon={<LuHistory />}
                            text="Вернуть последнюю версию"
                            variant="outline"
                            className="w-auto"
                            onClick={handleRestoreLastVersion}
                        />
                    )}
                    <Button
                        icon={<MdDeleteOutline />}
                        text="Удалить"
                        variant="danger"
                        className="w-auto"
                        onClick={() => setDeleteOpen(true)}
                    />
                </div>
            )}

            <div className={selectedFileId ? "flex flex-row flex-1 min-h-0" : "h-full"}>
                <div className={selectedFileId ? "pl-36 pr-16 flex-1 min-h-0 overflow-y-auto pb-16" : "h-full w-full"}>
                    {selectedFileId ? (
                        accessDenied ? (
                            <NoAccessState detail={accessDenied} />
                        ) : isEditing ? (
                            <EditMod ref={editModRef} key={selectedFileId} noteId={selectedFileId} onStatsChange={setStats} />
                        ) : (
                            <ViewMod key={selectedFileId} noteId={selectedFileId} onStatsChange={setStats} />
                        )
                    ) : (
                        <EmptyNoteState />
                    )}
                </div>

                {selectedFileId && !accessDenied && note && (
                    <div className="w-72 shrink-0 border-l border-nt-outline-variant bg-nt-surface min-h-0 overflow-hidden">
                        <AttachmentsPanel
                            noteId={selectedFileId}
                            canEdit={
                                currentUser?.role === "ADMIN" ||
                                note.can_edit.some((u) => u.id === currentUser?.id)
                            }
                        />
                    </div>
                )}
            </div>

            {selectedFileId && !accessDenied && stats && (
                <div className="shrink-0 w-full flex justify-between items-center px-6 py-2.5 border-t border-mg-text-3 bg-nt-primary/10 text-sm font-medium text-mg-text">
                    <span>
                        {note?.last_modifier
                            ? `Последнее изменение: ${formatUserName(note.last_modifier)} · ${formatDateTime(note.updated_at)}`
                            : note
                                ? `Создано: ${formatDateTime(note.created_at)}`
                                : ""}
                    </span>
                    <span>{stats.words} слов · {stats.lines} строк · {stats.characters} символов</span>
                </div>
            )}

            <Modal
                isOpen={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                className="w-[30rem] max-w-[90vw]"
            >
                <div className="p-8 space-y-5">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-mg-text-3 uppercase">Удаление заметки</p>
                        <h1 className="text-xl font-bold text-mg-text">Точно удалить?</h1>
                    </div>
                    <p className="text-sm text-mg-text-2">
                        Файл будет удалён без возможности восстановления.
                    </p>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            text="Отмена"
                            variant="outline"
                            className="w-32"
                            onClick={() => setDeleteOpen(false)}
                            disabled={deleting}
                        />
                        <Button
                            text={deleting ? "Удаление..." : "Удалить"}
                            variant="danger"
                            className="w-32"
                            onClick={handleDelete}
                            disabled={deleting}
                        />
                    </div>
                </div>
            </Modal>

            <div
                className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${
                    isPeopleSettingsOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                onClick={() => setIsPeopleSettingsOpen(false)}
            >
                <div
                    className={`absolute top-0 right-0 h-full shadow-xl transition-transform duration-300 ease-in-out ${
                        isPeopleSettingsOpen ? "translate-x-0" : "translate-x-full"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {note && currentUser && (
                        <PeopleSettings
                            note={note}
                            currentUser={currentUser}
                            onClose={() => setIsPeopleSettingsOpen(false)}
                            onNoteUpdate={setNote}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}