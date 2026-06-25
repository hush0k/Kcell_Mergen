interface InputProps {
    id?: string
    placeholder?: string
    type: React.HTMLInputTypeAttribute
    value?: string
    onChange?: React.ChangeEventHandler<HTMLInputElement>
    error?: string
}

export function Input({ id, placeholder, type, value, onChange, error }: InputProps) {
    return (
        <div className="flex flex-col gap-1">
            <input
                id={id}
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className={`w-full px-3 py-3 text-base font-normal text-mg-text bg-mg-purple-soft-2 border-2 rounded-2xl outline-none focus:ring-2 focus:outline-none cursor-text transition-all duration-200 ${
                    error
                        ? "border-mg-danger-fg focus:ring-mg-danger-fg/30"
                        : "border-mg-purple-soft focus:ring-mg-purple-soft"
                }`}
            />
            {error && (
                <p className="text-xs text-mg-danger-fg px-1">{error}</p>
            )}
        </div>
    )
}