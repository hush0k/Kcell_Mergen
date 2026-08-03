import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { api } from "@/api/resources";
import { Button } from "@/components/Button";
import { AdminUsersTable } from "@/features/admin/components/AdminUsersTable";
import { AdminUserDocumentsTable } from "@/features/admin/components/AdminUserDocumentsTable";
import { formatUserName, isAdminRole } from "@/features/admin/utils";
import type { CurrentUser, User } from "@/types/api";

export function AdminPage() {
    const [me, setMe] = useState<CurrentUser | null | undefined>(undefined);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        api.auth.me().then(setMe).catch(() => setMe(null));
    }, []);

    if (me === undefined) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-mg-text-3">
                Загрузка...
            </div>
        );
    }

    if (!isAdminRole(me?.role)) {
        return <Navigate to="/home" replace />;
    }

    return (
        <div className="flex flex-col h-full px-6 pt-7 pb-9">
            <div className="flex flex-row justify-between items-center gap-4">
                <div className="flex flex-col space-y-1 min-w-0">
                    <p className="text-xs text-mg-text-3 font-bold">АДМИНИСТРИРОВАНИЕ</p>
                    <h2 className="text-2xl text-mg-text font-bold truncate">
                        {selectedUser ? formatUserName(selectedUser) : "Пользователи"}
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    <p className="text-xs text-mg-text-2">
                        Всего: <span className="font-bold">{total}</span>
                    </p>
                    {selectedUser && (
                        <Button
                            icon={<FiArrowLeft size={16}/>}
                            text="Назад"
                            variant="outline"
                            className="w-auto px-4 py-[0.55rem]"
                            onClick={() => {
                                setSelectedUser(null);
                                setTotal(0);
                            }}
                        />
                    )}
                </div>
            </div>

            <div className="flex-1 min-h-0 mt-5">
                {selectedUser ? (
                    <AdminUserDocumentsTable
                        user={selectedUser}
                        onTotalChange={setTotal}
                    />
                ) : (
                    <AdminUsersTable
                        onSelectUser={setSelectedUser}
                        onTotalChange={setTotal}
                    />
                )}
            </div>
        </div>
    );
}
