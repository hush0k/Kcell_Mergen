import { forwardRef, useImperativeHandle, useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { api } from '@/api/resources';
import type { Id, MeNoteWithAll } from '@/types/api';
import { Button } from "@/components/Button";
import { useNoteSelection } from "@/contexts/NoteSelectionContext";
import { FaListUl, FaListOl } from "react-icons/fa";
import { VscTasklist } from "react-icons/vsc";
import { HiCode } from "react-icons/hi";
import { createLowlight, common } from 'lowlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import 'highlight.js/styles/github-dark.css';
import { MdOutlineTableChart, MdAddBox, MdRemoveCircleOutline, MdDeleteOutline, MdOutlineLink, MdHorizontalRule } from "react-icons/md";
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Tags } from "@/features/note_home/components/Tags"
import { Wikilink } from "@/features/note_home/components/WikilinkExtension"

export interface NoteStats {
    words: number;
    lines: number;
    characters: number;
}

export interface EditModHandle {
    saveVersion: () => void;
    restoreLastVersion: () => void;
}

interface EditModProps {
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

const ZOOM_LEVELS = [50, 75, 90, 100, 110, 125, 150, 175, 200];

export const EditMod = forwardRef<EditModHandle, EditModProps>(function EditMod(
    { noteId, onStatsChange },
    ref
) {
    const [note, setNote] = useState<MeNoteWithAll | null>(null);
    const [name, setName] = useState('');
    const [zoom, setZoom] = useState(100);
    const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const nameTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedContent = useRef<string>('');
    const lastSavedName = useRef<string>('');
    const isHydrating = useRef(false);
    const lowlight = createLowlight(common);
    const { triggerRefresh } = useNoteSelection();

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ codeBlock: false }),
            Underline,
            TaskList,
            TaskItem.configure({ nested: true }),
            CodeBlockLowlight.configure({ lowlight }),
            Table.configure({ resizable: true }),
            TableRow,
            TableCell,
            TableHeader,
            Link.configure({ openOnClick: false, autolink: true }),
            Placeholder.configure({ placeholder: 'Напишите что-нибудь...' }),
            Highlight.configure({ multicolor: false }),
            Wikilink,
        ],
        content: '',
        onUpdate: ({ editor }) => {
            onStatsChange?.(computeStats(editor.getText()));
            if (isHydrating.current) return;
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
            saveTimeout.current = setTimeout(() => {
                const json = editor.getJSON();
                const serialized = JSON.stringify(json);
                if (serialized === lastSavedContent.current) return;
                lastSavedContent.current = serialized;
                api.meNote.update(noteId, { content: json });
            }, 800);
        },
    });

    const editorState = useEditorState({
        editor,
        selector: ctx => ({
            boldd: ctx.editor?.isActive('bold') ?? false,
            italic: ctx.editor?.isActive('italic') ?? false,
            underline: ctx.editor?.isActive('underline') ?? false,
            strike: ctx.editor?.isActive('strike') ?? false,
            heading1: ctx.editor?.isActive('heading', { level: 1 }) ?? false,
            heading2: ctx.editor?.isActive('heading', { level: 2 }) ?? false,
            heading3: ctx.editor?.isActive('heading', { level: 3 }) ?? false,
            heading4: ctx.editor?.isActive('heading', { level: 4 }) ?? false,
            heading5: ctx.editor?.isActive('heading', { level: 5 }) ?? false,
            heading6: ctx.editor?.isActive('heading', { level: 6 }) ?? false,
            bulletList: ctx.editor?.isActive('bulletList') ?? false,
            orderedList: ctx.editor?.isActive('orderedList') ?? false,
            taskList: ctx.editor?.isActive('taskList') ?? false,
            isTable: ctx.editor?.isActive('table') ?? false,
            isLink: ctx.editor?.isActive('link') ?? false,
            highlight: ctx.editor?.isActive('highlight') ?? false,
        }) satisfies Record<string, boolean>,
    });

    useImperativeHandle(ref, () => ({
        saveVersion: () => {
            if (!editor) return;
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
            const json = editor.getJSON();
            const serialized = JSON.stringify(json);
            lastSavedContent.current = serialized;
            api.meNote.update(noteId, {
                content: json,
                last_version: json,
            });
        },
        restoreLastVersion: () => {
            if (!editor || !note?.last_version) return;
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
            isHydrating.current = true;
            editor.commands.setContent(note.last_version, { emitUpdate: true });
            isHydrating.current = false;
            onStatsChange?.(computeStats(editor.getText()));
            lastSavedContent.current = JSON.stringify(editor.getJSON());
            api.meNote.update(noteId, { content: note.last_version });
        },
    }));

    useEffect(() => {
        const controller = new AbortController();
        let cancelled = false;

        api.meNote.startEdit(noteId)
            .then(() => {
                if (cancelled) return;
                return api.meNote.get(noteId, { signal: controller.signal });
            })
            .then((data) => {
                if (cancelled || !data) return;
                setNote(data);
                setName(data.name ?? '');
                lastSavedName.current = data.name ?? '';
            })
            .catch((err) => {
                if (err.name !== 'AbortError') console.error(err);
            });

        const heartbeat = setInterval(() => {
            api.meNote.startEdit(noteId).catch(console.error);
        }, 60_000);

        const releaseLock = () => {
            api.meNote.stopEdit(noteId).catch(console.error);
        };
        window.addEventListener('pagehide', releaseLock);
        window.addEventListener('beforeunload', releaseLock);

        return () => {
            cancelled = true;
            controller.abort();
            clearInterval(heartbeat);
            window.removeEventListener('pagehide', releaseLock);
            window.removeEventListener('beforeunload', releaseLock);
            releaseLock();
        };
    }, [noteId]);

    useEffect(() => {
        if (!editor || !note) return;
        isHydrating.current = true;
        editor.commands.setContent(note.content ?? '');
        isHydrating.current = false;
        editor.commands.focus('end');
        onStatsChange?.(computeStats(editor.getText()));
        lastSavedContent.current = JSON.stringify(editor.getJSON());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor, note?.id]);

    if (!editor || !note) return null;

    const handleNameChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setName(value);
        if (nameTimeout.current) clearTimeout(nameTimeout.current);
        nameTimeout.current = setTimeout(() => {
            if (value === lastSavedName.current) return;
            lastSavedName.current = value;
            api.meNote.update(noteId, { name: value }).then(() => {
                triggerRefresh();
            });
        }, 800);
    };

    // === Text formatting: bold, italic, underline, strike, highlight ===
    const buttonsType = [
        { name: "B", onClickFunc: () => editor.chain().focus().toggleBold().run(), active: editorState?.boldd, style: "font-black" },
        { name: "I", onClickFunc: () => editor.chain().focus().toggleItalic().run(), active: editorState?.italic, style: "italic" },
        { name: "U", onClickFunc: () => editor.chain().focus().toggleUnderline().run(), active: editorState?.underline, style: "underline" },
        { name: "S", onClickFunc: () => editor.chain().focus().toggleStrike().run(), active: editorState?.strike, style: "line-through" },
        { name: "H", onClickFunc: () => editor.chain().focus().toggleHighlight().run(), active: editorState?.highlight, style: "" },
    ];

    // === Lists: bullet, ordered, task ===
    const buttonsList = [
        { name: "unordered", icon: <FaListUl />, onClickFunc: () => editor.chain().focus().toggleBulletList().run(), active: editorState?.bulletList },
        { name: "ordered", icon: <FaListOl />, onClickFunc: () => editor.chain().focus().toggleOrderedList().run(), active: editorState?.orderedList },
        { name: "list", icon: <VscTasklist />, onClickFunc: () => editor.chain().focus().toggleTaskList().run(), active: editorState?.taskList },
    ];

    // === Blocks: code, link, table, divider ===
    const buttonsOther = [
        {
            name: "code",
            icon: <HiCode />,
            onClickFunc: () => editor.chain().focus().toggleCodeBlock().run(),
            active: false,
        },
        {
            name: "link",
            icon: <MdOutlineLink />,
            onClickFunc: () => {
                const previousUrl = editor.getAttributes('link').href as string | undefined;
                const url = window.prompt('URL ссылки', previousUrl ?? '');
                if (url === null) return;
                if (url === '') {
                    editor.chain().focus().extendMarkRange('link').unsetLink().run();
                    return;
                }
                editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
            },
            active: editorState?.isLink,
        },
        {
            name: "table",
            icon: <MdOutlineTableChart />,
            onClickFunc: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
            active: false,
        },
        {
            name: "hr",
            icon: <MdHorizontalRule />,
            onClickFunc: () => editor.chain().focus().setHorizontalRule().run(),
            active: false,
        },
    ];

    // === Table controls: shown only when cursor is inside a table ===
    const tableButtons = [
        { name: "row+", icon: <MdAddBox />, onClickFunc: () => editor.chain().focus().addRowAfter().run() },
        { name: "row-", icon: <MdRemoveCircleOutline />, onClickFunc: () => editor.chain().focus().deleteRow().run() },
        { name: "col+", icon: <MdAddBox />, onClickFunc: () => editor.chain().focus().addColumnAfter().run() },
        { name: "col-", icon: <MdRemoveCircleOutline />, onClickFunc: () => editor.chain().focus().deleteColumn().run() },
        { name: "table-", icon: <MdDeleteOutline />, onClickFunc: () => editor.chain().focus().deleteTable().run() },
    ];

    function getActiveHeadingLevel(): number | '' {
        if (editorState?.heading1) return 1;
        if (editorState?.heading2) return 2;
        if (editorState?.heading3) return 3;
        if (editorState?.heading4) return 4;
        if (editorState?.heading5) return 5;
        if (editorState?.heading6) return 6;
        return '';
    }

    const activeHeading = getActiveHeadingLevel();

    return (
        <div className={"flex flex-col h-full"}>
            {/* === Toolbar === */}
            <div className={"flex flex-row space-x-4 shrink-0 flex-wrap items-center border-b border-mg-text-3 px-6 py-1"}>
                <div className="flex flex-row space-x-2">
                    {buttonsType.map((button) => (
                        <Button
                            key={button.name}
                            variant={"ghost"}
                            text={button.name}
                            className={`w-10 h-10 font-medium text-lg rounded-none py-2 justify-center items-center ${button.active ? 'bg-mg-purple-soft text-mg-purple' : ''} ${button.style}`}
                            onClick={button.onClickFunc}
                        />
                    ))}
                </div>

                <div className="w-0 self-stretch border-r border-mg-text-3"/>

                <select
                    value={activeHeading}
                    onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                            editor.chain().focus().setParagraph().run();
                        } else {
                            editor.chain().focus().toggleHeading({ level: Number(value) as 1|2|3|4|5|6 }).run();
                        }
                    }}
                >
                    <option value="">Обычный текст</option>
                    <option value="1">Heading 1</option>
                    <option value="2">Heading 2</option>
                    <option value="3">Heading 3</option>
                    <option value="4">Heading 4</option>
                    <option value="5">Heading 5</option>
                    <option value="6">Heading 6</option>
                </select>

                <div className="w-0 self-stretch border-r border-mg-text-3"/>

                <div className={"flex flex-row space-x-2"}>
                    {buttonsList.map((button) => (
                        <Button
                            key={button.name}
                            variant={"ghost"}
                            icon={button.icon}
                            className={`w-10 h-10 font-medium text-lg rounded-none py-2 justify-center items-center ${button.active ? 'bg-mg-purple-soft text-mg-purple' : ''}`}
                            onClick={button.onClickFunc}
                        />
                    ))}
                </div>

                <div className="w-0 self-stretch border-r border-mg-text-3"/>

                <div className={"flex flex-row space-x-2"}>
                    {buttonsOther.map((button) => (
                        <Button
                            key={button.name}
                            variant={"ghost"}
                            icon={button.icon}
                            className={`w-10 h-10 font-medium text-lg rounded-none py-2 justify-center items-center ${button.active ? 'bg-mg-purple-soft text-mg-purple' : ''}`}
                            onClick={button.onClickFunc}
                        />
                    ))}
                </div>

                {editorState?.isTable && (
                    <>
                        <div className="w-0 self-stretch border-r border-mg-text-3"/>
                        <div className="flex flex-row space-x-1 px-2 py-1 bg-mg-purple-soft-2 rounded-lg">
                            {tableButtons.map((button) => (
                                <Button
                                    key={button.name}
                                    variant={"ghost"}
                                    icon={button.icon}
                                    title={button.name}
                                    className="w-8 h-8 justify-center items-center"
                                    onClick={button.onClickFunc}
                                />
                            ))}
                        </div>
                    </>
                )}

                <div className="w-0 self-stretch border-r border-mg-text-3"/>

                <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))}>
                    {ZOOM_LEVELS.map((level) => (
                        <option key={level} value={level}>{level}%</option>
                    ))}
                </select>
            </div>

            {/* === File name (Notion-style editable title) === */}
            <textarea
                value={name}
                onChange={handleNameChange}
                placeholder="Без названия"
                rows={1}
                className="text-5xl font-bold bg-transparent outline-none text-mg-text w-full resize-none px-6 pt-6 pb-10 min-h-[4.5rem]"
            />

            <div className={"px-6"}>
                <Tags note={note}/>
            </div>

            {/* === Editor content === */}
            <div className={"flex-1 overflow-y-auto px-6"}>
                <EditorContent editor={editor} style={{ zoom: `${zoom}%` }} />
            </div>
        </div>
    );
});