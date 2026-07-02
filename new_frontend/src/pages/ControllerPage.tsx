import { useState, useEffect } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { ControlFilterBlock } from "@/features/control/components/FilterBlock";
import { GoSearch } from "react-icons/go";
import { FiFilter } from "react-icons/fi";
import { AiOutlinePlus } from "react-icons/ai";
import { ControlTable, type ControlFilters } from "@/features/control/components/ControlTable";
import { Modal } from "@/components/Modal"
import { CreateControlPopup } from "@/features/control/components/CreateControlPopup"


export function ControllerPage() {
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [filterOn, setFilterOn] = useState(false);
    const [filters, setFilters] = useState<ControlFilters>({});
    const [refreshKey, setRefreshKey] = useState(0);
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    return (
        <div className="flex flex-col h-full px-6 pt-7 pb-9">
            <div className="flex flex-row justify-between items-center">
                <div className="flex flex-col space-y-1">
                    <p className="text-xs text-mg-text-3 font-bold">РЕЕСТР</p>
                    <h2 className="text-2xl text-mg-text font-bold">Контроллеры</h2>
                </div>
                <p className="text-xs text-mg-text-2">
                    Всего: <span className="font-bold">{total}</span>
                </p>
            </div>

            <div className="flex flex-row justify-between items-center gap-3 mt-5">
                <div className="flex flex-row gap-3 flex-1 min-w-0">
                    <Input
                        id="search-input"
                        type="text"
                        placeholder="Поиск по контроллерам..."
                        containerClassName="flex-1 min-w-0"
                        className="bg-mg-surface text-sm rounded-[12px] border"
                        icon={<GoSearch />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <Button className="px-4 shrink-0" icon={<GoSearch />} />
                </div>
                <Button
                    icon={<AiOutlinePlus />}
                    text="Добавить"
                    className="w-36 py-[0.55rem]"
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

            <ControlFilterBlock
                filterOn={filterOn}
                onFilterChange={setFilters}
            />

            <div className="flex-1 min-h-0 mt-5">
                <ControlTable
                    onTotalChange={setTotal}
                    filters={filters}
                    search={debouncedSearch}
                    onView={(id: string) => setEditId(Number(id))}
                    refreshTrigger={refreshKey}
                />
            </div>


            <Modal
                isOpen={isCreateOpen || editId !== null}
                onClose={() => { setIsCreateOpen(false); setEditId(null); }}
                className="w-[58rem] max-w-[90vw]"
            >
                <CreateControlPopup
                    controlId={editId ?? undefined}
                    onClose={() => { setIsCreateOpen(false); setEditId(null); }}
                    onSaved={() => setRefreshKey(k => k + 1)}
                />
            </Modal>
        </div>
    )
}