import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import { createLowlight, common } from 'lowlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import 'highlight.js/styles/github-dark.css';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { useEffect, useState } from 'react';
import { api } from '@/api/resources';
import type { Id, MeNoteWithAll } from '@/types/api';
import type { NoteStats } from './EditMod';

interface ViewModProps {
    noteId: Id;
    onStatsChange?: (stats: NoteStats) => void;
}

function computeStats(text: string): NoteStats {
    const trimmed = text.trim();
    return {
        words: trimmed ? trimmed.split(/\s+/).length : 0,
        lines: text ? text.split(/\n/).length : 0,
        characters: text.length,
    };
}

export function ViewMod({ noteId, onStatsChange }: ViewModProps) {
    const [note, setNote] = useState<MeNoteWithAll | null>(null);
    const lowlight = createLowlight(common);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TaskList,
            TaskItem.configure({ nested: true }),
            CodeBlockLowlight.configure({ lowlight }),
            Table,
            TableRow,
            TableCell,
            TableHeader,
            Link.configure({ openOnClick: true }),
            Highlight.configure({ multicolor: false }),
        ],
        content: '',
        editable: false,
    });

    useEffect(() => {
        const controller = new AbortController();
        api.meNote.get(noteId, { signal: controller.signal })
            .then((data) => {
                setNote(data);
                editor?.commands.setContent(data.content ?? '');
                if (editor) onStatsChange?.(computeStats(editor.getText()));
            })
            .catch((err) => {
                if (err.name !== 'AbortError') console.error(err);
            });
        return () => controller.abort();
    }, [noteId, editor]);

    if (!editor || !note) return null;

    return (
        <div className="flex flex-col h-full">
            <h1 className="text-5xl font-bold text-mg-text px-6 pt-6 pb-10">
                {note.name || "Без названия"}
            </h1>
            <div className="flex-1 overflow-y-auto px-6">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}