interface InputProps {
    id?: string,
    placeholder?: string;
    type: React.HTMLInputTypeAttribute;
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

export function Input({id, placeholder, type, value, onChange}: InputProps) {
    return (
        <input
            id={id}
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="w-full px-3 py-3 text-base font-normal text-mg-text bg-mg-purple-soft-2 border-2 rounded-2xl border-mg-purple-soft outline-none focus:ring-2 focus:ring-mg-purple-soft focus:outline-none cursor-text transition-all duration-200"
        />
    )
}