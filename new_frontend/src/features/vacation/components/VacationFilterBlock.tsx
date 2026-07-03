import { Button } from "@/components/Button";
import { useSessionStorage } from "@/features/home/hooks/UseSessionStorage";
import type { VacationStatus, VacationType } from "@/types/vacation";
import { vacationStatusOptions, vacationTypeOptions } from "@/features/vacation/components/vacationOptions";
import type { VacationFilters } from "@/features/vacation/components/VacationTable";
import { useEffect } from "react";

interface VacationFilterProps {
    filterOn: boolean;
    onFilterChange: (filters: VacationFilters) => void;
}

interface VacationFilterState {
    status: string;
    vacationType: string;
}

const defaultState: VacationFilterState = {
    status: "",
    vacationType: "",
};

export function VacationFilterBlock({ filterOn, onFilterChange }: VacationFilterProps) {
    const [filterState, setFilterState] = useSessionStorage<VacationFilterState>(
        "vacationFilterBlockState",
        defaultState,
    );

    const emit = (next: VacationFilterState) => {
        onFilterChange({
            status: (next.status || undefined) as VacationStatus | undefined,
            vacation_type: (next.vacationType || undefined) as VacationType | undefined,
        });
    };

    useEffect(() => {
        emit(filterState);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const update = (patch: Partial<VacationFilterState>) => {
        const next = { ...filterState, ...patch };
        setFilterState(next);
        emit(next);
    };

    const toggle = (key: keyof VacationFilterState, value: string) => {
        update({ [key]: filterState[key] === value ? "" : value } as Partial<VacationFilterState>);
    };

    return (
        <div className={`overflow-hidden transition-all duration-300 ${filterOn ? "max-h-96 opacity-100" : "max-h-0 opacity-0"} w-full bg-mg-surface flex flex-col rounded-2xl mt-4`}>
            <div className="flex flex-col gap-6 p-6">
                <div className="flex flex-row flex-wrap gap-x-12 gap-y-6">
                    <div className="flex flex-col gap-2">
                        <h3 className="font-semibold text-sm text-mg-text-2">По активности</h3>
                        <div className="flex flex-row flex-wrap gap-2">
                            {vacationStatusOptions.map(status => (
                                <Button
                                    key={status.value}
                                    text={status.label}
                                    variant="outline"
                                    className={`py-1 px-3 font-medium text-sm rounded-full w-auto ${
                                        filterState.status === status.value ? "bg-mg-purple text-white border-mg-purple hover:bg-mg-purple" : "bg-mg-surface"
                                    }`}
                                    onClick={() => toggle("status", status.value)}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <h3 className="font-semibold text-sm text-mg-text-2">По типу</h3>
                        <div className="flex flex-row flex-wrap gap-2">
                            {vacationTypeOptions.map(type => (
                                <Button
                                    key={type.value}
                                    text={type.label}
                                    variant="outline"
                                    className={`py-1 px-3 font-medium text-sm rounded-full w-auto ${
                                        filterState.vacationType === type.value ? "bg-mg-purple text-white border-mg-purple hover:bg-mg-purple" : "bg-mg-surface"
                                    }`}
                                    onClick={() => toggle("vacationType", type.value)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="border-b border-mg-border" />
                <div className="flex justify-end">
                    <Button
                        text="Сбросить все"
                        className="w-36"
                        onClick={() => {
                            setFilterState(defaultState);
                            emit(defaultState);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
