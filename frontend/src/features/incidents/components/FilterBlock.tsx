import { useEffect } from "react";
import { Button } from "@/components/Button";
import { useSessionStorage } from "@/features/home/hooks/UseSessionStorage";
import type { IncidentStatus } from "@/types/api";
import type { IncidentFilters } from "@/features/incidents/components/IncidentTable";

interface Props {
    filterOn: boolean;
    onFilterChange: (filters: IncidentFilters) => void;
}

interface IncidentFilterState {
    status: IncidentStatus | "";
    caseType: string;
}

const defaultState: IncidentFilterState = {
    status: "",
    caseType: "",
};

const STATUS_OPTIONS: IncidentStatus[] = ["Открыт", "На согласовании", "Согласован", "Отклонён"];

export function IncidentFilterBlock({ filterOn, onFilterChange }: Props) {
    const [state, setState] = useSessionStorage<IncidentFilterState>("incidentFilterBlockState", defaultState);

    const emit = (next: IncidentFilterState) => {
        onFilterChange({
            status: next.status || undefined,
            case_type: next.caseType || undefined,
        });
    };

    const toggle = (key: keyof IncidentFilterState, value: string) => {
        const next = { ...state, [key]: state[key] === value ? "" : value };
        setState(next);
        emit(next);
    };

    const reset = () => {
        setState(defaultState);
        emit(defaultState);
    };

  
    useEffect(() => emit(state), []);

    return (
        <div className={`overflow-hidden transition-all duration-300 ${filterOn ? "max-h-96 opacity-100 mt-5" : "max-h-0 opacity-0"}`}>
            <div className="flex flex-col gap-4 p-4 rounded-2xl border-2 border-mg-purple-soft bg-mg-purple-soft-2">
                <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-mg-text-3 uppercase">Статус</p>
                    <div className="flex flex-row flex-wrap gap-2">
                        {STATUS_OPTIONS.map(s => (
                            <Button
                                key={s}
                                variant="outline"
                                size="sm"
                                text={s}
                                className={state.status === s ? "bg-mg-purple text-white border-mg-purple hover:bg-mg-purple" : ""}
                                onClick={() => toggle("status", s)}
                            />
                        ))}
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    text="Сбросить все"
                    className="w-fit"
                    onClick={reset}
                />
            </div>
        </div>
    )
}