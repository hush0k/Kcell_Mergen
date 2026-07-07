import { useState, useEffect } from "react"
import { Button } from "@/components/Button"
import { api } from "@/api/resources"
import { User } from "@/types/api"
import { useSessionStorage } from "@/features/home/hooks/UseSessionStorage"
import type { ControlFilters } from "@/features/control/components/ControlTable"
import type { ControlStatus, Frequency } from "@/types/api"

interface ControlFilterProps {
    filterOn: boolean
    onFilterChange: (filters: ControlFilters) => void
}

const frequencyOptions: { label: string; value: Frequency }[] = [
    { label: "Ежедневно", value: "ежедневно" },
    { label: "Еженедельно", value: "еженедельно" },
    { label: "Ежемесячно", value: "ежемесячно" },
    { label: "Ежеквартально", value: "ежеквартально" },
    { label: "По запросу", value: "по запросу" },
]

const areaOptions = ["TF", "IF", "DEV", "RA", "A2P"]

const statusOptions: { label: string; value: ControlStatus }[] = [
    { label: "Активный", value: "ACTIVE" },
    { label: "Приостановлен", value: "SUSPENDED" },
]

interface ControlFilterState {
    area: string
    controlStatus: string
    frequency: string
    responsibleId: string
}

const defaultState: ControlFilterState = {
    area: "",
    controlStatus: "",
    frequency: "",
    responsibleId: "",
}

export function ControlFilterBlock({ filterOn, onFilterChange }: ControlFilterProps) {
    const [filterState, setFilterState] = useSessionStorage<ControlFilterState>(
        'controlFilterBlockState',
        defaultState
    )
    const [users, setUsers] = useState<User[]>([])
    const { area, controlStatus, frequency, responsibleId } = filterState

    useEffect(() => {
        api.users.list().then(setUsers)
    }, [])

    const emit = (next: ControlFilterState) => {
        onFilterChange({
            area: next.area || undefined,
            control_status: (next.controlStatus || undefined) as ControlStatus | undefined,
            frequency: (next.frequency || undefined) as Frequency | undefined,
            responsible_id: next.responsibleId ? Number(next.responsibleId) : undefined,
        })
    }

    useEffect(() => {
        emit(filterState)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const update = (patch: Partial<ControlFilterState>) => {
        const next = { ...filterState, ...patch }
        setFilterState(next)
        emit(next)
    }

    const toggle = (key: keyof ControlFilterState, value: string) => {
        update({ [key]: filterState[key] === value ? "" : value } as Partial<ControlFilterState>)
    }

    return (
        <div className={`overflow-hidden transition-all duration-300 ${filterOn ? "max-h-96 opacity-100" : "max-h-0 opacity-0"} w-full bg-mg-surface flex flex-col rounded-2xl mt-4`}>
            <div className="flex flex-col gap-6 p-6">
                <div className="flex flex-col space-y-4">
                    <div className="flex flex-row flex-wrap gap-x-12 gap-y-6">
                        <div className="flex flex-col gap-2">
                            <h3 className="font-semibold text-sm text-mg-text-2">По частоте</h3>
                            <div className="flex flex-row flex-wrap gap-2">
                                {frequencyOptions.map(f => (
                                    <Button
                                        key={f.value}
                                        text={f.label}
                                        variant="outline"
                                        className={`py-1 px-3 font-medium text-sm rounded-full w-auto ${
                                            frequency === f.value ? "bg-mg-purple text-white border-mg-purple hover:bg-mg-purple" : "bg-mg-surface"
                                        }`}
                                        onClick={() => toggle("frequency", f.value)}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <h3 className="font-semibold text-sm text-mg-text-2">Область</h3>
                            <div className="flex flex-row flex-wrap gap-2">
                                {areaOptions.map(a => (
                                    <Button
                                        key={a}
                                        text={a}
                                        variant="outline"
                                        className={`py-1 px-3 font-medium text-sm rounded-full w-auto ${
                                            area === a ? "bg-mg-purple text-white border-mg-purple hover:bg-mg-purple" : "bg-mg-surface"
                                        }`}
                                        onClick={() => toggle("area", a)}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <h3 className="font-semibold text-sm text-mg-text-2">По статусу</h3>
                            <div className="flex flex-row flex-wrap gap-2">
                                {statusOptions.map(s => (
                                    <Button
                                        key={s.value}
                                        text={s.label}
                                        variant="outline"
                                        className={`py-1 px-3 font-medium text-sm rounded-full w-auto ${
                                            controlStatus === s.value ? "bg-mg-purple text-white border-mg-purple hover:bg-mg-purple" : "bg-mg-surface"
                                        }`}
                                        onClick={() => toggle("controlStatus", s.value)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-row flex-wrap gap-x-12 gap-y-6">
                        <div className="flex flex-col space-y-2">
                            <label htmlFor="responsible_id" className="text-mg-text-2 font-semibold">Ответственный</label>
                            <select
                                id="responsible_id"
                                value={responsibleId}
                                onChange={(e) => update({ responsibleId: e.target.value })}
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
                            setFilterState(defaultState)
                            emit(defaultState)
                        }}
                    />
                </div>
            </div>
        </div>
    )
}