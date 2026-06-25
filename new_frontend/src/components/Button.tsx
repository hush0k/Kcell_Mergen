import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
    "inline-flex items-center justify-center gap-2 font-bold transition-all duration-200 rounded-control outline-none",
    {
        variants: {
            variant: {
                primary: "bg-mg-purple text-white hover:bg-mg-purple-deep",
                outline: "border-2 border-mg-border text-mg-text-2 bg-mg-purple-soft-2 hover:bg-mg-purple-soft",
                ghost: "bg-transparent text-mg-purple hover:bg-mg-purple-soft",
                danger: "border-2 border-mg-danger-fg text-mg-danger-fg hover:bg-mg-danger-bg hover:text-mg-surface",
            },
            iconOnly: {
                true: "p-2",
                false: "w-full",
            },
            size: {
                sm: "px-3 py-2 text-sm",
                md: "px-4 py-3 text-base",
            },
        },
        defaultVariants: {
            variant: "primary",
        },
    }
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md";
    icon?: React.ReactNode;
    text?: string;
}

export function Button({ variant, size, icon, text, onClick, className, ...props }: ButtonProps) {
    const iconOnly = !!icon && !text;
    return (
        <button
            className={cn(button({ variant, size: iconOnly ? undefined : size ?? "md", iconOnly }), className)}
            onClick={onClick}
            {...props}
        >
            {icon}
            {text}
        </button>
    );
}