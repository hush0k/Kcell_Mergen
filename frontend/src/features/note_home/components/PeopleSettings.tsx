import { useEffect, useState } from "react"
import type { CurrentUser, MeNoteWithAll, User, UserBrief } from "@/types/api"
import { Button } from "@/components/Button"
import { IoCloseSharp } from "react-icons/io5"
import { api } from "@/api/resources"

interface Props {
    note: MeNoteWithAll
    currentUser: CurrentUser
    onClose: () => void
    onNoteUpdate: (note: MeNoteWithAll) => void
}

type PermissionMode = "read" | "edit"

const STORAGE_KEY = "peopleSettingsPermissionMode"

function formatUserName(user: UserBrief | User): string {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ")
    return fullName || user.username
}

export function PeopleSettings({ note, currentUser, onClose, onNoteUpdate }: Props) {
    const [mode, setMode] = useState<PermissionMode>(() => {
        const stored = sessionStorage.getItem(STORAGE_KEY)
        return stored === "edit" ? "edit" : "read"
    })
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [allUsers, setAllUsers] = useState<User[]>([])
    const [busyUserId, setBusyUserId] = useState<number | null>(null)

    useEffect(() => {
        sessionStorage.setItem(STORAGE_KEY, mode)
    }, [mode])

    useEffect(() => {
        api.users.list().then(setAllUsers).catch((e) => console.error(e))
    }, [])

    const roleById = new Map(allUsers.map((u) => [u.id, u.role]))
    const isAdmin = currentUser.role === "ADMIN"
    const isCreator = note.creater_id === currentUser.id
    const canManage = isAdmin || isCreator

    const list = mode === "read" ? note.can_read : note.can_edit
    const existingIds = new Set(list.map((u) => u.id))

    const handleRemove = async (userId: number) => {
        setBusyUserId(userId)
        try {
            const updated = mode === "read"
                ? await api.meNote.removeReaderRoot(note.id, userId)
                : await api.meNote.removeEditorRoot(note.id, userId)
            onNoteUpdate(updated)
        } catch (e) {
            console.error(e)
        } finally {
            setBusyUserId(null)
        }
    };

    const handleAdd = async (userId: number) => {
        setBusyUserId(userId)
        try {
            const updated = mode === "read"
                ? await api.meNote.giveReaderRoot(note.id, userId)
                : await api.meNote.giveEditorRoot(note.id, userId)
            onNoteUpdate(updated)
        } catch (e) {
            console.error(e)
        } finally {
            setBusyUserId(null)
        }
    };

    return (
        <div className="h-full w-[30rem] bg-mg-surface flex flex-col py-10 px-5 space-y-4 relative overflow-hidden">
            <div className="flex flex-row justify-end">
                <Button
                    icon={<IoCloseSharp size={20} />}
                    variant="ghost"
                    className="p-2 hover:rotate-90 w-10 h-10"
                    onClick={onClose}
                />
            </div>

            <div className="space-y-2">
                <p className="text-sm font-semibold text-mg-text-2">Кто может</p>
                <div className="flex flex-row bg-mg-purple-soft-2 rounded-lg p-1">
                    <button
                        className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            mode === "read" ? "bg-mg-surface text-mg-text shadow" : "text-mg-text-2"
                        }`}
                        onClick={() => setMode("read")}
                    >
                        прочитать
                    </button>
                    <button
                        className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            mode === "edit" ? "bg-mg-surface text-mg-text shadow" : "text-mg-text-2"
                        }`}
                        onClick={() => setMode("edit")}
                    >
                        редактировать
                    </button>
                </div>
            </div>

            <ul className="flex-1 overflow-y-auto">
                {list.map((user, i) => {
                    const isSelf = user.id === currentUser.id
                    const isUserAdmin = roleById.get(user.id) === "ADMIN"
                    const canDelete = canManage && !isSelf && !isUserAdmin
                    return (
                        <li key={user.id} className="flex flex-row justify-between items-center py-2 hover:bg-mg-purple-soft-2 rounded-lg px-4 text-lg font-medium">
                            <p className="whitespace-nowrap">{i + 1}. {formatUserName(user)}</p>
                            {canDelete && (
                                <Button
                                    text="Удалить"
                                    variant="danger"
                                    size="sm"
                                    className="w-auto py-1"
                                    disabled={busyUserId === user.id}
                                    onClick={() => handleRemove(user.id)}
                                />
                            )}
                        </li>
                    )
                })}
            </ul>

            {canManage && (
                <Button
                    text="Добавить пользователя"
                    onClick={() => setIsAddOpen(true)}
                />
            )}

            <div
                className={`absolute inset-x-0 bottom-0 bg-mg-surface border-t border-mg-text-3 rounded-t-2xl shadow-xl transition-transform duration-300 ease-in-out max-h-[70%] flex flex-col ${
                    isAddOpen ? "translate-y-0" : "translate-y-full"
                }`}
            >
                <div className="flex flex-row justify-between items-center px-5 py-4 shrink-0">
                    <p className="text-sm font-semibold text-mg-text-2">Добавить пользователя</p>
                    <Button
                        icon={<IoCloseSharp size={18} />}
                        variant="ghost"
                        className="p-2 w-8 h-8"
                        onClick={() => setIsAddOpen(false)}
                    />
                </div>
                <ul className="overflow-y-auto px-5 pb-5 space-y-1">
                    {allUsers.filter((u) => !existingIds.has(u.id)).map((user) => (
                        <li key={user.id} className="flex flex-row justify-between items-center py-2 hover:bg-mg-purple-soft-2 rounded-lg px-4">
                            <p className="whitespace-nowrap">{formatUserName(user)}</p>
                            <Button
                                text="Добавить"
                                size="sm"
                                className="w-auto py-1"
                                disabled={busyUserId === user.id}
                                onClick={() => handleAdd(user.id)}
                            />
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}