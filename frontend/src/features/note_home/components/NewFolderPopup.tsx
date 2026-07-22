import { useState } from "react";
import { api } from "@/api/resources";
import type { DirectoryResponse } from "@/types/api";

interface NewFolderPopupProps {
    onCreated?: (directory: DirectoryResponse) => void;
    onClose?: () => void;
}

export function NewFolderPopup({ onClose, onCreated }: NewFolderPopupProps) {
    const [name, setName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        const trimmed = name.trim();
        if (!trimmed || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const newDirectory: DirectoryResponse = await api.directory.create({ name: trimmed });
            onCreated?.(newDirectory);
            onClose?.();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={"w-[35rem] h-[8rem] bg-nt-surface-container-low rounded-lg shadow-[0_5px_20px_rgba(0,0,0,0.20)] border border-mg-border flex items-end px-8 py-10"}>
            <input
                type="text"
                className={"bg-nt-surface-container-low border-b-2 border-nt-outline w-full text-lg outline-none"}
                placeholder={"Название папки"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                }}
                autoFocus
            />
        </div>
    )
}