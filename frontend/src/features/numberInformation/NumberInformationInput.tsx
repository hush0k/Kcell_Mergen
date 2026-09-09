import { Input } from "@/components/Input"

interface NumberInformationInputProps {
    value: string
    onChange: (value: string) => void
}

export function NumberInformationInput({ value, onChange }: NumberInformationInputProps) {
    return (
        <Input
            type={"textarea"}
            className={"bg-mg-surface min-h-[200px] overflow-y-scroll"}
            placeholder={"+77757327183 \n+77012318476"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    )
}
