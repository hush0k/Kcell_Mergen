import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '@/api/resources';
import type { Id, MeNoteWithAll } from '@/types/api';

interface EditModProps {
    noteId: Id;
}

export function EditMod({ noteId }: EditModProps) {
    const [note, setNote] = useState<MeNoteWithAll | null>(null);
    const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const editor = useEditor({
        extensions: [StarterKit],
        content: '',
        onUpdate: ({ editor }) => {
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
            saveTimeout.current = setTimeout(() => {
                api.meNote.update(noteId, { content: editor.getJSON() });
            }, 800);
        },
    });

    useEffect(() => {
        const controller = new AbortController();
        api.meNote.get(noteId, { signal: controller.signal })
            .then((data) => {
                setNote(data);
                editor?.commands.setContent(data.content ?? '');
            })
            .catch((err) => {
                if (err.name !== 'AbortError') console.error(err);
            });
        api.meNote.startEdit(noteId);
        return () => controller.abort();
    }, [noteId, editor]);

    if (!editor || !note) return null;

    return (
        <div>
            <div className="toolbar">
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={editor.isActive('bold') ? 'active' : ''}
                >
                    B
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={editor.isActive('italic') ? 'active' : ''}
                >
                    I
                </button>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}