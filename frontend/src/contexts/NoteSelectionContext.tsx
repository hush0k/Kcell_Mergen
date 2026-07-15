// contexts/NoteSelectionContext.tsx
import { createContext, useContext, useState, ReactNode } from "react";

const SELECTED_FILE_KEY = "note-selected-file-id";

interface NoteSelectionContextType {
    selectedFileId: number | null;
    setSelectedFileId: (id: number | null) => void;
    refreshKey: number;
    triggerRefresh: () => void;
}

const NoteSelectionContext = createContext<NoteSelectionContextType | null>(null);

export function NoteSelectionProvider({ children }: { children: ReactNode }) {
    const [selectedFileId, setSelectedFileIdState] = useState<number | null>(() => {
        try {
            const raw = sessionStorage.getItem(SELECTED_FILE_KEY);
            return raw ? Number(raw) : null;
        } catch {
            return null;
        }
    });
    const [refreshKey, setRefreshKey] = useState(0);
    const triggerRefresh = () => setRefreshKey((prev) => prev + 1);

    const setSelectedFileId = (id: number | null) => {
        setSelectedFileIdState(id);
        try {
            if (id == null) {
                sessionStorage.removeItem(SELECTED_FILE_KEY);
            } else {
                sessionStorage.setItem(SELECTED_FILE_KEY, String(id));
            }
        } catch {
            // ignore storage errors
        }
    };

    return (
        <NoteSelectionContext.Provider value={{ selectedFileId, setSelectedFileId, refreshKey, triggerRefresh }}>
            {children}
        </NoteSelectionContext.Provider>
    );
}

export function useNoteSelection() {
    const ctx = useContext(NoteSelectionContext);
    if (!ctx) throw new Error("useNoteSelection must be used within NoteSelectionProvider");
    return ctx;
}