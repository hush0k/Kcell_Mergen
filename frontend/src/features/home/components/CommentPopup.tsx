import { useState, useEffect } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { IoCloseSharp } from "react-icons/io5";

interface Props {
    text: string;
    onTextChange: (text: string) => void;
    onClose: () => void;
    onSave: (text: string) => Promise<void>;
}

export function CommentPopup({ text, onTextChange, onClose, onSave }: Props) {
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        if (!text.trim()) return;
        setSaving(true);
        await onSave(text);
        setSaving(false);
        onClose();
    }
    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        }
    }

    useEffect(() => {
        function handleEsc(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    return (
        <div className="flex flex-col h-auto p-5 rounded-3xl w-[37rem] space-y-3 bg-mg-surface">
            <div className="flex flex-row w-full justify-end">
                <Button icon={<IoCloseSharp size={20}/>} variant="ghost" className="p-1.5 hover:rotate-90" onClick={onClose}/>
            </div>
            <Input
                type="textarea"
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
                className="bg-mg-surface"
                onKeyDown={handleKeyDown}
                autoFocus
            />
            <div className="flex flex-row w-full justify-end">
                <Button
                    size="sm"
                    text="Сохранить"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-26"
                />
            </div>
        </div>
    )
}