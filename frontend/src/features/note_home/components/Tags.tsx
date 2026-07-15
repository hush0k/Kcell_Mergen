import { useState } from "react";
import { createPortal } from "react-dom";
import { RxCross2 } from "react-icons/rx";
import { Button } from "@/components/Button";
import { MdOutlineAdd } from "react-icons/md";
import type { MeNoteWithAll } from "@/types/api";
import { api } from "@/api/resources";
import { NewTagPopup } from "@/features/note_home/components/NewTagPopup";

interface Props {
    note: MeNoteWithAll;
    onTagsChange?: (tags: string[]) => void;
}

export function Tags({ note, onTagsChange }: Props) {
    const [tags, setTags] = useState<string[]>((note.tags ?? []).map(tag => tag.name));
    const [isPopupOpen, setIsPopupOpen] = useState(false);

    const handleAddTag = async (newTag: string) => {
        const trimmed = newTag.trim();
        if (!trimmed || tags.includes(trimmed)) return;

        const updated = [...tags, trimmed];
        try {
            await api.meNote.update(note.id, { tags: updated });
            setTags(updated);
            onTagsChange?.(updated);
        } catch (err) {
            console.error(err);
        }
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        const updated = tags.filter(t => t !== tagToRemove);
        try {
            await api.meNote.update(note.id, { tags: updated });
            setTags(updated);
            onTagsChange?.(updated);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className={"flex flex-row space-x-4 items-center"}>
            {tags.map(name => (
                <div className={"px-2 py-1 border border-mg-border bg-mg-lime text-sm text-mg-surface font-semibold flex flex-row items-center space-x-1"} key={name}>
                    <p>{name}</p>
                    <button className={"outline-none p-0 m-0"} onClick={() => handleRemoveTag(name)}>
                        <RxCross2 />
                    </button>
                </div>
            ))}
            <Button
                icon={<MdOutlineAdd size={16} />}
                className={"bg-mg-lime text-mg-surface p-1 rounded-sm"}
                onClick={() => setIsPopupOpen(true)}
            />

            {isPopupOpen && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onClick={() => setIsPopupOpen(false)}
                >
                    <div onClick={(e) => e.stopPropagation()}>
                        <NewTagPopup
                            onClose={() => setIsPopupOpen(false)}
                            onCreated={handleAddTag}
                        />
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}