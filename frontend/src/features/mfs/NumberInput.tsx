import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

interface NumberInputProps {
    value: string;
    onChange: (value: string) => void;
}

export function NumberInput({ value, onChange }: NumberInputProps) {
    return (
        <div className="p-6 border border-mg-border rounded-3xl bg-mg-surface">
            <div className="flex flex-row items-center justify-between w-full">
                <h2 className={"font-semibold text-xl text-mg-text"}>Номера (общее поле)</h2>
                <Button
                    variant={"ghost"}
                    text={"Очистить"}
                    className={"w-auto text-sm hover:bg-mg-surface"}
                    size={"sm"}
                    onClick={() => onChange("")}
                />
            </div>

            <Input
                type={"textarea"}
                placeholder={"77012113212"}
                className={"placeholder:text-mg-text-2 bg-mg-surface-2 min-h-[200px] overflow-y-scroll overflow-x-hidden"}
                rows={7}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    )
}
