import { useState } from "react";
import { TbLockFilled } from "react-icons/tb";
import { Button } from "@/components/Button";
import { api } from "@/api/resources";
import type { MeNoteAccessDeniedDetail } from "@/types/api";

interface NoAccessStateProps {
    detail: MeNoteAccessDeniedDetail | null;
}

function formatOwnerName(owner: MeNoteAccessDeniedDetail["owner"]): string {
    if (!owner) return "";
    const fullName = [owner.first_name, owner.last_name].filter(Boolean).join(" ");
    return fullName || owner.username;
}

export function NoAccessState({ detail }: NoAccessStateProps) {
    const ownerName = formatOwnerName(detail?.owner ?? null);
    const [wantsEdit, setWantsEdit] = useState(false);
    const [requesting, setRequesting] = useState(false);
    const [requested, setRequested] = useState(false);
    const [error, setError] = useState(false);

    const handleRequestAccess = async () => {
        if (!detail?.note_id || requesting || requested) return;
        setRequesting(true);
        setError(false);
        try {
            await api.notifications.requestNoteAccess(detail.note_id, wantsEdit);
            setRequested(true);
        } catch (e) {
            console.error(e);
            setError(true);
        } finally {
            setRequesting(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full w-full text-center px-6">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-mg-purple-soft text-mg-purple mb-6">
                <TbLockFilled size={40} />
            </div>
            <h2 className="text-2xl font-bold text-mg-text mb-2">Нет доступа к заметке</h2>
            <p className="text-mg-text-2 max-w-sm mb-1">
                У вас нет прав для просмотра {detail?.note_name ? `«${detail.note_name}»` : "этой заметки"}
            </p>
            {ownerName && (
                <p className="text-mg-text-2 max-w-sm mb-6">
                    Доступ может предоставить: <span className="font-semibold text-mg-text">{ownerName}</span>
                </p>
            )}
            <label className="flex items-center gap-2 mb-4 text-sm text-mg-text-2 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={wantsEdit}
                    onChange={(e) => setWantsEdit(e.target.checked)}
                    disabled={requesting || requested}
                    className="w-4 h-4 accent-mg-purple cursor-pointer"
                />
                Также запросить права на редактирование
            </label>
            <Button
                text={requested ? "Запрос отправлен" : requesting ? "Отправка..." : "Запросить доступ"}
                className={requested ? "w-auto bg-emerald-700 hover:bg-emerald-700 text-white" : "w-auto"}
                disabled={requesting || requested}
                onClick={handleRequestAccess}
            />
            {error && (
                <p className="text-red-500 text-sm mt-3">Не удалось отправить запрос. Попробуйте ещё раз.</p>
            )}
        </div>
    );
}