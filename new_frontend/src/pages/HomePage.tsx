import { useState, useEffect } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { GoSearch } from "react-icons/go";
import { FiFilter } from "react-icons/fi";
import { FilterBlock } from "@/features/home/components/FilterBlock";
import { TaskTable } from "@/features/home/components/TaskTable";
import { PopupTask } from "@/features/home/components/PopupTask";
import { useSessionStorage } from "@/features/home/hooks/UseSessionStorage";

export function HomePage() {
    const [filterOn, setFilterOn] = useState(false);
    const [filters, setFilters] = useSessionStorage<{
        status?: string[];
        frequency?: string;
        area?: string[];
        user_id?: number;
        responsible_id?: number;
    }>('taskFilters', { status: ["NOT_STARTED", "IN_PROGRESS"] });
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [total, setTotal] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    function handlePopupClose(changed?: boolean) {
        setSelectedId(null);
        if (changed) setRefreshKey(k => k + 1);
    }

    return (
        <div className="flex flex-col h-full px-6 pt-7 pb-9">
            <div className="flex flex-row justify-between items-center">
                <div className="flex flex-col space-y-1">
                    <p className="text-xs text-mg-text-3 font-bold">РЕЕСТР</p>
                    <h2 className="text-2xl text-mg-text font-bold">Задачи</h2>
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
                        placeholder="Поиск по задачам, людям, инцидентам..."
                        containerClassName="flex-1 min-w-0"
                        className="bg-mg-surface text-sm rounded-[12px] border"
                        icon={<GoSearch />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <Button className="px-4 shrink-0" icon={<GoSearch />} />
                </div>
                <Button
                    icon={<FiFilter />}
                    text="Фильтрация"
                    variant="outline"
                    className={`shrink-0 w-auto py-[0.55rem] ${filterOn ? "bg-mg-purple text-white border-mg-purple hover:bg-mg-purple" : ""}`}
                    onClick={() => setFilterOn(!filterOn)}
                />
            </div>

            <FilterBlock
                filterOn={filterOn}
                onFilterChange={setFilters}
            />

            <div className="flex-1 min-h-0 mt-5">
                <TaskTable
                    key={refreshKey}
                    onTotalChange={setTotal}
                    filters={filters}
                    search={debouncedSearch}
                    onView={(id:string) => setSelectedId(String(id))}
                />
            </div>

            { selectedId && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <PopupTask
                        id={selectedId}
                        onClose={handlePopupClose}
                    />
                </div>
            )}

        </div>
    );
}