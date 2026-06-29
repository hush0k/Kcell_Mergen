import { useState } from "react"
import { Button } from "@/components/Button"

const filterBy = [
    {
        name: "По статусу",
        values: [
            { status_: "Не начата" },
            { status_: "В процессе" },
            { status_: "Выполнены" },
            { status_: "Просроченные" },
            { status_: "По запросу" },
        ]
    },
    {
        name: "Область",
        values: [
            { status_: "УГД" },
            { status_: "МФС" },
            { status_: "ЛРТ" },
            { status_: "УЗИ" },
        ]
    }
]

interface FilterProps {
    filterOn: boolean
}

export function FilterBlock({ filterOn }: FilterProps) {
    const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())

    const toggleFilter = (status: string) => {
        setActiveFilters(prev => {
            const next = new Set(prev)
            if (next.has(status)) {
                next.delete(status)
            } else {
                next.add(status)
            }
            return next
        })
    }

    return (
        <div className={`overflow-hidden transition-all duration-300 ${filterOn ? "max-h-96 opacity-100" : "max-h-0 opacity-0"} w-full bg-mg-surface flex flex-col rounded-2xl mt-4`}>
            <div className="flex flex-col gap-6 p-6">
                <div className="flex flex-row flex-wrap gap-x-12 gap-y-6">
                    {filterBy.map(filter => (
                        <div key={filter.name} className="flex flex-col gap-2">
                            <h3 className="font-semibold text-sm text-mg-text-2">{filter.name}</h3>
                            <div className="flex flex-row flex-wrap gap-2">
                                {filter.values.map(value => (
                                    <Button
                                        key={value.status_}
                                        text={value.status_}
                                        variant="outline"
                                        className={`py-1 px-3 font-medium text-sm rounded-full w-auto ${
                                            activeFilters.has(value.status_)
                                                ? "bg-mg-purple text-white border-mg-purple hover:bg-mg-purple"
                                                : "bg-mg-surface"
                                        }`}
                                        onClick={() => toggleFilter(value.status_)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="border-b border-mg-border" />
                <div className="flex justify-end">
                    <Button
                        text="Сбросить все"
                        className="w-36"
                        onClick={() => setActiveFilters(new Set())}
                    />
                </div>
            </div>
        </div>
    )
}
