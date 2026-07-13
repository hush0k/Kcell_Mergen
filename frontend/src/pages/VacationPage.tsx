import { useEffect, useState } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { GoSearch } from "react-icons/go";
import { FiFilter } from "react-icons/fi";
import { AiOutlinePlus } from "react-icons/ai";
import { api } from "@/api/resources";
import { VacationFilterBlock } from "@/features/vacation/components/VacationFilterBlock";
import { VacationTable, type VacationFilters } from "@/features/vacation/components/VacationTable";
import { CreateVacationPopup } from "@/features/vacation/components/CreateVacationPopup";
import type { VacationScheduleWithUser } from "@/types/vacation";
import type { CurrentUser, UserRole } from "@/types/api"

export function VacationPage() {
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filterOn, setFilterOn] = useState(false);
    const [filters, setFilters] = useState<VacationFilters>({});
    const [refreshKey, setRefreshKey] = useState(0);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<VacationScheduleWithUser | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [me, setMe] = useState<CurrentUser | null>(null);

    useEffect(() => {
        api.auth.me().then(data => setMe(data));
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    const closeForm = () => {
        setIsCreateOpen(false);
        setEditId(null);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.vacationSchedule.remove(deleteTarget.id);
            setDeleteTarget(null);
            setRefreshKey(k => k + 1);
        } catch (e) {
            console.error(e);
        } finally {
            setDeleting(false);
        }
    };

    const deleteTargetName = deleteTarget?.user
        ? `${deleteTarget.user.last_name ?? ""} ${deleteTarget.user.first_name ?? ""}`.trim() || deleteTarget.user.username
        : "этот отпуск";

    return (
        <div className="flex flex-col h-full px-6 pt-7 pb-9">
            <div className="flex flex-row justify-between items-center">
                <div className="flex flex-col space-y-1">
                    <p className="text-xs text-mg-text-3 font-bold">РЕЕСТР</p>
                    <h2 className="text-2xl text-mg-text font-bold">Отпуски</h2>
                </div>
                <p className="text-xs text-mg-text-2">
                    Всего: <span className="font-bold">{total}</span>
                </p>
            </div>

            <div className="flex flex-row justify-between items-center gap-3 mt-5">
                <div className="flex flex-row gap-3 flex-1 min-w-0">
                    <Input
                        id="vacation-search-input"
                        type="text"
                        placeholder="Поиск по людям..."
                        containerClassName="flex-1 min-w-0"
                        className="bg-mg-surface text-sm rounded-[12px] border"
                        icon={<GoSearch />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <Button className="px-4 shrink-0" icon={<GoSearch />} onClick={() => setDebouncedSearch(search)} />
                </div>
                <Button
                    icon={<AiOutlinePlus />}
                    text="Создать"
                    className={`w-36 py-[0.55rem] ${me?.role === "ADMIN" ? "visible" : "hidden"}`}
                    onClick={() => setIsCreateOpen(true)}
                />
                <Button
                    icon={<FiFilter />}
                    text="Фильтрация"
                    variant="outline"
                    className={`shrink-0 w-auto py-[0.55rem] ${filterOn ? "bg-mg-purple text-white border-mg-purple hover:bg-mg-purple" : ""}`}
                    onClick={() => setFilterOn(!filterOn)}
                />
            </div>

            <VacationFilterBlock
                filterOn={filterOn}
                onFilterChange={setFilters}
            />

            <div className="flex-1 min-h-0 mt-5">
                <VacationTable
                    onTotalChange={setTotal}
                    filters={filters}
                    search={debouncedSearch}
                    onEdit={setEditId}
                    onDelete={setDeleteTarget}
                    refreshTrigger={refreshKey}
                />
            </div>

            <Modal
                isOpen={isCreateOpen || editId !== null}
                onClose={closeForm}
                className="w-[48rem] max-w-[90vw]"
            >
                <CreateVacationPopup
                    vacationId={editId ?? undefined}
                    onClose={closeForm}
                    onSaved={() => setRefreshKey(k => k + 1)}
                />
            </Modal>

            <Modal
                isOpen={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                className="w-[30rem] max-w-[90vw]"
            >
                <div className="p-8 space-y-5">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-mg-text-3 uppercase">Удаление отпуска</p>
                        <h1 className="text-xl font-bold text-mg-text">Точно удалить?</h1>
                    </div>
                    <p className="text-sm text-mg-text-2">
                        Запись отпуска для {deleteTargetName} будет удалена без восстановления.
                    </p>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            text="Отмена"
                            variant="outline"
                            className="w-32"
                            onClick={() => setDeleteTarget(null)}
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

        </div>
    )
}
