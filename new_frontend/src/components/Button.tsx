import { cva } from "class-variance-authority";

const button = cva(
    "inline-flex items-center justify-center gap-2 font-bold transition-all duration-200 rounded-control w-full",
    {
        variants: {
            variant: {
                primary: "bg-mg-purple text-white hover:bg-mg-purple-deep",
                outline: "border-2 border-mg-purple text-mg-purple bg-transparent hover:bg-mg-purple-soft",
                ghost: "bg-transparent text-mg-purple hover:bg-mg-purple-soft",
                danger: "border-2 border-mg-danger-fg text-mg-danger-fg hover:bg-mg-danger-bg hover:text-mg-surface",
            },
            size: {
                sm: "px-3 py-2 text-sm",
                md: "px-4 py-3 text-base",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "md",
        },
    }
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md";
    icon?: React.ReactNode;
    text?: string;
}

export function Button({ variant, size, icon, text, onClick, ...props }: ButtonProps) {
    return (
        <button className={button({ variant, size })} onClick={onClick} {...props}>
            {icon}
            {text}
        </button>
    );
}