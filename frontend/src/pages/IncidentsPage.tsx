import { useState, useEffect } from "react";
import { api } from "@/api/resources";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { GoSearch } from "react-icons/go";
import { AiOutlinePlus } from "react-icons/ai";
import { BsFilter } from "react-icons/bs";
import type { CurrentUser } from "@/types/api";
import { IncidentFilterBlock } from "@/features/incidents/components/FilterBlock";
import { IncidentTable, type IncidentFilters } from "@/features/incidents/components/IncidentTable";
import { CreateIncidentPopup } from "@/features/incidents/components/CreateIncidentPopup";
import { IncidentDetailPopup } from "@/features/incidents/components/IncidentDetailPopup";

export function IncidentsPage() {
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filterOn, setFilterOn] = useState(false);
    const [filters, setFilters] = useState<IncidentFilters>({});
    const [refreshKey, setRefreshKey] = useState(0);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [viewId, setViewId] = useState<number | null>(null);
    const [me, setMe] = useState<CurrentUser | null>(null);

    useEffect(() => {
        api.auth.me().then(data => setMe(data));
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    return (
        <div className="flex flex-col h-full px-6 pt-7 pb-9">
            <div className="flex flex-row justify-between items-end">
                <div className="flex flex-col space-y-2">
                    <p className="text-xs font-semibold text-mg-text-3 uppercase">Реестр</p>
                    <h2 className="text-2xl font-bold text-mg-text">Инциденты</h2>
                </div>
                <p className="text-sm text-mg-text-3">Всего: {total}</p>
            </div>

            <div className="flex flex-row gap-2 mt-6">
                <Input
                    type="text"
                    icon={<GoSearch size={16}/>}
                    placeholder="Поиск по инцидентам..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    containerClassName="flex-1"
                />
                <Button icon={<GoSearch size={16} className={"w-8"}/>} variant="outline" onClick={() => setDebouncedSearch(search)} />
                <Button
                    className="w-auto shrink-0"
                    icon={<AiOutlinePlus size={16}/>}
                    text="Добавить"
                    onClick={() => setIsCreateOpen(true)}
                />
                <Button
                    className="w-auto shrink-0"
                    icon={<BsFilter size={16}/>}
                    text="Фильтрация"
                    variant={filterOn ? "primary" : "outline"}
                    onClick={() => setFilterOn(f => !f)}
                />
            </div>

            <IncidentFilterBlock filterOn={filterOn} onFilterChange={setFilters} />

            <div className="flex-1 min-h-0 mt-5">
                <IncidentTable
                    onTotalChange={setTotal}
                    filters={filters}
                    search={debouncedSearch}
                    onView={(id) => setViewId(Number(id))}
                    refreshTrigger={refreshKey}
                />
            </div>

            <Modal
                isOpen={isCreateOpen || editId !== null}
                onClose={() => { setIsCreateOpen(false); setEditId(null); }}
                className="w-[58rem] max-w-[90vw]"
            >
                <CreateIncidentPopup
                    incidentId={editId ?? undefined}
                    onClose={() => { setIsCreateOpen(false); setEditId(null); }}
                    onSaved={() => setRefreshKey(k => k + 1)}
                />
            </Modal>

            <Modal
                isOpen={viewId !== null}
                onClose={() => setViewId(null)}
                className="w-[58rem] max-w-[90vw]"
            >
                {viewId !== null && (
                    <IncidentDetailPopup
                        incidentId={viewId}
                        me={me}
                        onClose={() => setViewId(null)}
                        onChanged={() => setRefreshKey(k => k + 1)}
                        onEdit={(id) => { setViewId(null); setEditId(id); }}
                    />
                )}
            </Modal>
        </div>
    )
}