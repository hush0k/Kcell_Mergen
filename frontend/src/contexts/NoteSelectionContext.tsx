// contexts/NoteSelectionContext.tsx
import { createContext, useContext, useState, ReactNode } from "react";

interface NoteSelectionContextType {
    selectedFileId: number | null;
    setSelectedFileId: (id: number | null) => void;
}

const NoteSelectionContext = createContext<NoteSelectionContextType | null>(null);

export function NoteSelectionProvider({ children }: { children: ReactNode }) {
    const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
    return (
        <NoteSelectionContext.Provider value={{ selectedFileId, setSelectedFileId }}>
            {children}
        </NoteSelectionContext.Provider>
    );
}

export function useNoteSelection() {
    const ctx = useContext(NoteSelectionContext);
    if (!ctx) throw new Error("useNoteSelection must be used within NoteSelectionProvider");
    return ctx;
}