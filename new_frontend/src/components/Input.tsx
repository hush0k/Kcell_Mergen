interface InputProps {
    id?: string
    placeholder?: string
    type: React.HTMLInputTypeAttribute
    value?: string
    onChange?: React.ChangeEventHandler<HTMLInputElement>
    error?: string
    icon?: React.ReactNode
    className?: string
    containerClassName?: string
}

export function Input({ id, placeholder, type, value, onChange, error, icon, className, containerClassName }: InputProps) {
    return (
        <div className={`flex flex-col gap-1 ${containerClassName ?? ""}`}>
            <div className="relative">
                {icon && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mg-text-3">
                        {icon}
                    </span>
                )}
                <input
                    id={id}
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className={`w-full py-3 text-base font-normal text-mg-text bg-mg-purple-soft-2 border-2 rounded-2xl outline-none focus:ring-2 focus:outline-none cursor-text transition-all duration-200 ${
                        icon ? "pl-9 pr-3" : "px-3"
                    } ${
                        error
                            ? "border-mg-danger-fg focus:ring-mg-danger-fg/30"
                            : "border-mg-purple-soft focus:ring-mg-purple-soft"
                    } ${className ?? ""}`}
                />
            </div>
            {error && (
                <p className="text-xs text-mg-danger-fg px-1">{error}</p>
            )}
        </div>
    )
}
