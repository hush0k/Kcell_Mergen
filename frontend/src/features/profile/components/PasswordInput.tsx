import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

interface Props {
    id?: string;
    placeholder?: string;
    value: string;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
}

export function PasswordInput({ id, placeholder, value, onChange }: Props) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative">
            <input
                id={id}
                type={visible ? "text" : "password"}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className="w-full py-3 pl-3 pr-10 text-base font-normal text-mg-text bg-mg-purple-soft-2 border-2 border-mg-purple-soft rounded-2xl outline-none focus:ring-2 focus:ring-mg-purple-soft focus:outline-none cursor-text transition-all duration-200"
            />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-mg-text-3 hover:text-mg-text transition-colors"
                tabIndex={-1}
            >
                {visible ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
        </div>
    );
}