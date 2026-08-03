import { cn } from "@/lib/utils";

interface Props {
    checked: boolean;
    disabled?: boolean;
    loading?: boolean;
    label: string;
    onChange: () => void;
}

export function AccessToggle({ checked, disabled, loading, label, onChange }: Props) {
    return (
        <button
            type="button"
            role="switch"
            aria-label={label}
            aria-checked={checked}
            disabled={disabled || loading}
            onClick={onChange}
            className={cn(
                "relative inline-flex h-8 w-[58px] shrink-0 items-center rounded-full border-2 p-0 transition-colors duration-300 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mg-purple disabled:cursor-not-allowed disabled:opacity-60",
                checked
                    ? "border-[#279b43] bg-[#34c759]"
                    : "border-[#c73535] bg-[#ff3b30]",
            )}
        >
            <span
                className={cn(
                    "absolute left-[3px] h-6 w-6 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.28)] transition-transform duration-300 ease-out",
                    checked ? "translate-x-[25px]" : "translate-x-0",
                    loading ? "scale-90 opacity-80" : "scale-100 opacity-100",
                )}
            />
        </button>
    );
}
