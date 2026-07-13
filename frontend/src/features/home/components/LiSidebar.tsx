import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Info {
    name?: string;
    icon?: ReactNode;
    isOpen?: boolean;
    onClick?: () => void;
    collapsed?: boolean;
    statistics?: number;
    className?: string;
    indicatorClassName?: string;
}

export function LiSidebar({ name, icon, isOpen, onClick, collapsed, statistics, className, indicatorClassName }: Info) {
    return (
        <button
            className={cn(
                "group flex flex-row items-center cursor-pointer py-4 w-full transition-all duration-300",
                isOpen && collapsed ? "bg-mg-purple-soft" : "hover:bg-mg-surface-2 text-mg-text-2 font-medium",
                className
            )}
            onClick={onClick}
        >
            {/* Индикатор */}
            <div className={cn(
                "-my-4 w-2 shrink-0 self-stretch rounded-r transition-all duration-200",
                isOpen
                    ? "bg-mg-purple-2 shadow-[2px_0_6px_0px_rgba(122,46,150,0.3)]"
                    : "bg-transparent group-hover:bg-mg-purple-soft",
                indicatorClassName
            )}/>

            {/* Иконка — всегда на месте */}
            <div className="relative w-16 flex items-center justify-center shrink-0">
                {icon}
                {collapsed && !!statistics && (
                    <span className="absolute top-2 right-4 min-w-[1.1rem] h-[1.1rem] px-1 flex items-center justify-center rounded-full bg-mg-purple text-white text-[10px] font-semibold">
                        {statistics}
                    </span>
                )}
            </div>

            {/* Текст — плавно скрывается */}
            <span className={cn(
                "flex-1 flex items-center justify-between transition-all duration-300 overflow-hidden whitespace-nowrap text-base text-left",
                collapsed ? "w-0 opacity-0" : "w-40 opacity-100"
            )}>
                <span>{name}</span>
                {!collapsed && !!statistics && (
                    <span className="mr-4 min-w-[1.25rem] px-1.5 py-0.5 flex items-center justify-center rounded-full bg-mg-purple-soft text-mg-purple text-xs font-semibold">
                        {statistics}
                    </span>
                )}
            </span>
        </button>
    )
}