import { Input } from "@/components/Input";
import { NUMBER_INFORMATION_CATEGORIES, type PaymentPeriod } from "./types";

interface NumberInformationCheckboxesProps {
    selected: Set<string>;
    onChange: (selected: Set<string>) => void;
    paymentPeriod: PaymentPeriod;
    onPaymentPeriodChange: (period: PaymentPeriod) => void;
    paymentDateFrom: string;
    onPaymentDateFromChange: (value: string) => void;
    paymentDateTo: string;
    onPaymentDateToChange: (value: string) => void;
}

export function NumberInformationCheckboxes({
    selected,
    onChange,
    paymentPeriod,
    onPaymentPeriodChange,
    paymentDateFrom,
    onPaymentDateFromChange,
    paymentDateTo,
    onPaymentDateToChange,
}: NumberInformationCheckboxesProps) {
    const toggleField = (code: string) => {
        const next = new Set(selected);
        if (next.has(code)) next.delete(code);
        else next.add(code);
        onChange(next);
    };

    const categoryFields = (fields: { code: string }[]) => fields.map((f) => f.code);

    const isCategoryChecked = (fields: { code: string }[]) =>
        categoryFields(fields).every((code) => selected.has(code));

    const isCategoryIndeterminate = (fields: { code: string }[]) =>
        !isCategoryChecked(fields) && categoryFields(fields).some((code) => selected.has(code));

    const toggleCategory = (fields: { code: string }[]) => {
        const next = new Set(selected);
        const allChecked = isCategoryChecked(fields);
        categoryFields(fields).forEach((code) => {
            if (allChecked) next.delete(code);
            else next.add(code);
        });
        onChange(next);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {NUMBER_INFORMATION_CATEGORIES.map((category) => (
                <div
                    key={category.id}
                    className="flex flex-col space-y-3 bg-mg-surface border border-mg-border rounded-2xl p-5"
                >
                    <Checkbox
                        label={category.title}
                        checked={isCategoryChecked(category.fields)}
                        indeterminate={isCategoryIndeterminate(category.fields)}
                        onClick={() => toggleCategory(category.fields)}
                        bold
                    />
                    <div className="h-px bg-mg-border" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 pl-1">
                        {category.fields.map((field) => (
                            <Checkbox
                                key={field.code}
                                label={field.label}
                                checked={selected.has(field.code)}
                                onClick={() => toggleField(field.code)}
                            />
                        ))}
                    </div>
                    {category.id === "payments" && selected.has("payment_amount") && (
                        <div className="flex flex-col space-y-3 pt-1">
                            <div className="h-px bg-mg-border" />
                            <RadioOption
                                label="за последний год"
                                checked={paymentPeriod === "last_year"}
                                onClick={() => onPaymentPeriodChange("last_year")}
                            />
                            <RadioOption
                                label="за период"
                                checked={paymentPeriod === "custom"}
                                onClick={() => onPaymentPeriodChange("custom")}
                            />
                            {paymentPeriod === "custom" && (
                                <div className="flex flex-row space-x-4 pl-9">
                                    <div className="flex flex-col space-y-1 w-40">
                                        <span className="mg-field-label">Дата начала</span>
                                        <Input
                                            type="date"
                                            value={paymentDateFrom}
                                            onChange={(e) => onPaymentDateFromChange(e.target.value)}
                                            className={"bg-mg-surface"}
                                        />
                                    </div>
                                    <div className="flex flex-col space-y-1 w-40">
                                        <span className="mg-field-label">Дата окончания</span>
                                        <Input
                                            type="date"
                                            value={paymentDateTo}
                                            onChange={(e) => onPaymentDateToChange(e.target.value)}
                                            className={"bg-mg-surface"}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function RadioOption({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
    return (
        <div className="flex flex-row items-center space-x-3 cursor-pointer" onClick={onClick}>
            <div
                className={`w-5 h-5 rounded-full ${
                    checked ? "bg-mg-purple" : "bg-mg-surface border-2 border-mg-text-3"
                } flex justify-center items-center transition-all duration-200`}
            >
                <div className={"w-2 h-2 bg-mg-surface rounded-full"} />
            </div>
            <p className="text-mg-text text-sm font-medium">{label}</p>
        </div>
    );
}

function Checkbox({
    label,
    checked,
    indeterminate,
    onClick,
    bold,
}: {
    label: string;
    checked: boolean;
    indeterminate?: boolean;
    onClick: () => void;
    bold?: boolean;
}) {
    return (
        <div className="flex flex-row items-center space-x-2.5 cursor-pointer select-none group" onClick={onClick}>
            <div
                className={`w-5 h-5 shrink-0 rounded-md flex items-center justify-center transition-all duration-200 ${
                    checked || indeterminate
                        ? "bg-mg-purple"
                        : "bg-mg-surface border-2 border-mg-text-3 group-hover:border-mg-purple"
                }`}
            >
                {checked && (
                    <svg width="11" height="11" viewBox="0 0 12 10" fill="none">
                        <path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
                {indeterminate && !checked && <div className="w-2.5 h-0.5 bg-white rounded-full" />}
            </div>
            <p
                className={
                    bold
                        ? "text-mg-text text-base font-bold tracking-tight"
                        : "text-mg-text-2 text-sm font-medium group-hover:text-mg-text transition-colors duration-150"
                }
            >
                {label}
            </p>
        </div>
    );
}