import type { ReactNode } from "react";

interface Info {
    name: string;
    icon: ReactNode;
    isOpen: boolean;
    onClick: () => void;
    collapsed: boolean;
}

export function LiSidebar({ name, icon, isOpen, onClick, collapsed }: Info) {
    return (
        <button
            className={`group flex flex-row items-center cursor-pointer py-4 w-full transition-all duration-300 ${isOpen && collapsed ? "bg-mg-purple-soft" : "hover:bg-mg-surface-2"}`}
            onClick={onClick}
        >
            {/* Индикатор */}
            <div className={`-my-4 w-2 shrink-0 self-stretch rounded-r transition-all duration-200 ${
                isOpen
                    ? "bg-mg-purple-2 shadow-[2px_0_6px_0px_rgba(122,46,150,0.3)]"
                    : "bg-transparent group-hover:bg-mg-purple-soft"
            }`}/>

            {/* Иконка — всегда на месте */}
            <div className="w-16 flex items-center justify-center shrink-0 text-mg-text-2">
                {icon}
            </div>

            {/* Текст — плавно скрывается */}
            <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-mg-text-2 font-medium text-base text-left ${
                collapsed ? "w-0 opacity-0" : "w-40 opacity-100"
            }`}>
                {name}
            </span>
        </button>
    )
}