import { useState } from "react";

interface NewTagPopupProps {
    onClose?: () => void;
    onCreated?: (tag: string) => void;
}

export function NewTagPopup({ onClose, onCreated }: NewTagPopupProps) {
    const [name, setName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        const trimmed = name.trim();
        if (!trimmed || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onCreated?.(trimmed);
            onClose?.();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={"w-[35rem] h-[8rem] bg-nt-surface-container-low rounded-lg shadow-[0_5px_20px_rgba(0,0,0,0.20)] border border-mg-border flex items-end px-8 py-10"}>
            <input
                type="text"
                className={"bg-nt-surface-container-low border-b-2 border-nt-outline w-full text-lg outline-none"}
                placeholder={"Название тега"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                }}
                autoFocus
            />
        </div>
    );
}