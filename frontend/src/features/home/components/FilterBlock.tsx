import { useState, useEffect } from "react"
import { Button } from "@/components/Button"
import { api } from "@/api/resources"
import { User } from "@/types/api"
import { useSessionStorage } from "@/features/home/hooks/UseSessionStorage"

type FilterOption = { label: string; value: string | string[] }
type FilterGroup = { name: string; values: FilterOption[] }

const filterBy: FilterGroup[] = [
    {
        name: "По статусу",
        values: [
            { label: "Текущие", value: ["NOT_STARTED", "IN_PROGRESS"] },
            { label: "Выполнены", value: "COMPLETED" },
            { label: "Просроченные", value: "OVERDUE" },
        ]
    },
    {
        name: "По запросу",
        values: [
            { label: "По запросу", value: "по запросу" }
        ]
    },
    {
        name: "Область",
        values: [
            { label: "TF", value: "TF" },
            { label: "IF", value: "IF" },
            { label: "DEV", value: "DEV" },
            { label: "RA", value: "RA" },
            { label: "A2P", value: "A2P" },
        ]
    }
]

interface FilterProps {
    filterOn: boolean
    onFilterChange: (filters: { status?: string[], frequency?: string, area?: string[], user_id?: number, responsible_id?: number }) => void
}

interface FilterBlockState {
    activeFilters: string[]
    activeAreas: string[]
    byQuery: boolean
    userId: string
    responsible: string
}

const defaultFilterBlockState: FilterBlockState = {
    activeFilters: ["NOT_STARTED", "IN_PROGRESS"],
    activeAreas: [],
    byQuery: false,
    userId: "",
    responsible: "",
}

export function FilterBlock({ filterOn, onFilterChange }: FilterProps) {
    const [filterState, setFilterState] = useSessionStorage<FilterBlockState>(
        'filterBlockState',
        defaultFilterBlockState
    )
    const [users, setUsers] = useState<User[]>([])

    const { activeFilters, activeAreas, byQuery, userId, responsible } = filterState

    useEffect(() => {
        api.users.list().then(setUsers)
    }, [])

    // применяем сохранённые фильтры при монтировании
    useEffect(() => {
        onFilterChange({
            status: activeFilters,
            frequency: byQuery ? "по запросу" : undefined,
            area: activeAreas.length ? activeAreas : undefined,
            user_id: userId ? Number(userId) : undefined,
            responsible_id: responsible ? Number(responsible) : undefined,
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const emit = (next: FilterBlockState) => {
        onFilterChange({
            status: next.activeFilters,
            frequency: next.byQuery ? "по запросу" : undefined,
            area: next.activeAreas.length ? next.activeAreas : undefined,
            user_id: next.userId ? Number(next.userId) : undefined,
            responsible_id: next.responsible ? Number(next.responsible) : undefined,
        })
    }

    const update = (patch: Partial<FilterBlockState>) => {
        const next = { ...filterState, ...patch }
        setFilterState(next)
        emit(next)
    }

    const toggleFilter = (values: string[]) => {
        const set = new Set<string>(activeFilters)
        const allActive = values.every(v => set.has(v))
        values.forEach(v => allActive ? set.delete(v) : set.add(v))
        update({ activeFilters: [...set] })
    }

    const toggleByQuery = () => {
        update({ byQuery: !byQuery })
    }

    const toggleArea = (value: string) => {
        const set = new Set<string>(activeAreas)
        set.has(value) ? set.delete(value) : set.add(value)
        update({ activeAreas: [...set] })
    }

    const handleUserChange = (value: string) => {
        update({ userId: value })
    }

    const handleResponsibleChange = (value: string) => {
        update({ responsible: value })
    }

    return (
        <div className={`overflow-hidden transition-all duration-300 ${filterOn ? "max-h-96 opacity-100" : "max-h-0 opacity-0"} w-full bg-mg-surface flex flex-col rounded-2xl mt-4`}>
            <div className="flex flex-col gap-6 p-6">
                <div className="flex flex-col space-y-4">
                    <div className="flex flex-row flex-wrap gap-x-12 gap-y-6">
                        {filterBy.map(filter => (
                            <div key={filter.name} className="flex flex-col gap-2">
                                <h3 className="font-semibold text-sm text-mg-text-2">{filter.name}</h3>
                                <div className="flex flex-row flex-wrap gap-2">
                                    {filter.name === "По запросу" ? (
                                        <Button
                                            text={filter.values[0].label}
                                            variant="outline"
                                            className={`py-1 px-3 font-medium text-sm rounded-full w-auto ${
                                                byQuery ? "bg-mg-purple text-white border-mg-purple hover:bg-mg-purple" : "bg-mg-surface"
                                            }`}
                                            onClick={toggleByQuery}
                                        />
                                    ) : filter.name === "Область" ? (
                                        filter.values.map(v => {
                                            const value = v.value as string
                                            const isActive = activeAreas.includes(value)
                                            return (
                                                <Button
                                                    key={value}
                                                    text={v.label}
                                                    variant="outline"
                                                    className={`py-1 px-3 font-medium text-sm rounded-full w-auto ${
                                                        isActive ? "bg-mg-purple text-white border-mg-purple hover:bg-mg-purple" : "bg-mg-surface"
                                                    }`}
                                                    onClick={() => toggleArea(value)}
                                                />
                                            )
                                        })
                                    ) : (
                                        filter.values.map(v => {
                                            const values = Array.isArray(v.value) ? v.value : [v.value]
                                            const isActive = values.every(val => activeFilters.includes(val))
                                            return (
                                                <Button
                                                    key={values.join("-")}
                                                    text={v.label}
                                                    variant="outline"
                                                    className={`py-1 px-3 font-medium text-sm rounded-full w-auto ${
                                                        isActive ? "bg-mg-purple text-white border-mg-purple hover:bg-mg-purple" : "bg-mg-surface"
                                                    }`}
                                                    onClick={() => toggleFilter(values)}
                                                />
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-row flex-wrap gap-x-12 gap-y-6">
                        <div className="flex flex-col space-y-2 ">
                            <label
                                htmlFor="responsible_id"
                                className="text-mg-text-2 font-semibold"
                            >Исполнитель</label>
                            <select
                                id="responsible_id"
                                value={responsible}
                                onChange={(e) => handleResponsibleChange(e.target.value)}
                                className="bg-mg-surface text-sm rounded-xl border px-2 py-1.5 outline-none"
                            >
                                <option value="">Выберите...</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.last_name} {u.first_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="border-b border-mg-border" />
                <div className="flex justify-end">
                    <Button
                        text="Сбросить все"
                        className="w-36"
                        onClick={() => {
                            const cleared: FilterBlockState = {
                                activeFilters: [],
                                byQuery: false,
                                activeAreas: [],
                                userId: "",
                                responsible: "",
                            }
                            setFilterState(cleared)
                            onFilterChange({ status: [], frequency: undefined, area: undefined, user_id: undefined, responsible_id: undefined })
                        }}
                    />
                </div>
            </div>
        </div>
    )
}