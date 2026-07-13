import { EditMod } from "@/features/note_home/components/EditMod";
import { useNoteSelection } from "@/contexts/NoteSelectionContext";

export function MergenNoteMainPage() {
    const { selectedFileId } = useNoteSelection();

    if (!selectedFileId) {
        return <div className="bg-nt-surface m-0 p-0 h-screen w-full flex items-center justify-center">Выберите файл</div>;
    }

    return (
        <div className={"bg-nt-surface m-0 p-0 h-screen w-full flex flex-col space-y-4 px-48 py-24"}>
            <EditMod noteId={selectedFileId} />
        </div>
    )
}