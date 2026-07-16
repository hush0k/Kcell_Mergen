import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import { api } from '@/api/resources';
import type { MeNoteSearchResult } from '@/types/api';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        wikilink: {
            insertWikilink: (attrs: { noteId: number; label: string }) => ReturnType;
        };
    }
}

function WikilinkView({ node }: { node: { attrs: { noteId: number; label: string } } }) {
    const { noteId, label } = node.attrs;
    return (
        <NodeViewWrapper as="span" className="wikilink-node">
            <a
                href={`#/notes/${noteId}`}
                className="text-mg-purple underline decoration-dotted cursor-pointer"
                onClick={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('wikilink-navigate', { detail: { noteId } }));
                }}
                contentEditable={false}
            >
                [[{label}]]
            </a>
        </NodeViewWrapper>
    );
}

export const Wikilink = Node.create({
    name: 'wikilink',
    group: 'inline',
    inline: true,
    atom: true,

    addAttributes() {
        return {
            noteId: { default: null },
            label: { default: '' },
        };
    },

    parseHTML() {
        return [{ tag: 'span[data-wikilink]' }];
    },

    renderHTML({ HTMLAttributes, node }) {
        return [
            'span',
            mergeAttributes(HTMLAttributes, { 'data-wikilink': '' }),
            `[[${node.attrs.label}]]`,
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(WikilinkView);
    },

    addCommands() {
        return {
            insertWikilink:
                (attrs) =>
                ({ chain }) =>
                    chain()
                        .insertContent({ type: this.name, attrs })
                        .run(),
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                char: '[[',
                allowSpaces: true,
                items: async ({ query }) => {
                    const results = await api.meNote.search(query, 10);
                    return results;
                },
                render: () => {
                    let popup: TippyInstance[] | null = null;
                    let selectedIndex = 0;
                    let currentItems: MeNoteSearchResult[] = [];
                    let currentCommand: ((item: MeNoteSearchResult) => void) | null = null;

                    const container = document.createElement('div');
                    container.className = 'wikilink-suggestion-list';

                    function renderList() {
                        container.innerHTML = '';
                        if (currentItems.length === 0) {
                            const empty = document.createElement('div');
                            empty.className = 'wikilink-suggestion-empty';
                            empty.textContent = 'Ничего не найдено';
                            container.appendChild(empty);
                            return;
                        }
                        currentItems.forEach((item, index) => {
                            const el = document.createElement('div');
                            el.className = `wikilink-suggestion-item${index === selectedIndex ? ' is-selected' : ''}`;
                            el.textContent = item.name || 'Без названия';
                            el.addEventListener('mousedown', (e) => {
                                e.preventDefault();
                                currentCommand?.(item);
                            });
                            container.appendChild(el);
                        });
                    }

                    return {
                        onStart: (props) => {
                            currentItems = props.items;
                            selectedIndex = 0;
                            currentCommand = props.command;
                            renderList();

                            popup = tippy('body', {
                                getReferenceClientRect: () => props.clientRect?.() as DOMRect,
                                appendTo: () => document.body,
                                content: container,
                                showOnCreate: true,
                                interactive: true,
                                trigger: 'manual',
                                placement: 'bottom-start',
                            });
                        },
                        onUpdate: (props) => {
                            currentItems = props.items;
                            currentCommand = props.command;
                            selectedIndex = 0;
                            renderList();
                            popup?.[0]?.setProps({
                                getReferenceClientRect: () => props.clientRect?.() as DOMRect,
                            });
                        },
                        onKeyDown: (props) => {
                            if (props.event.key === 'Escape') {
                                popup?.[0]?.hide();
                                return true;
                            }
                            if (props.event.key === 'ArrowDown') {
                                selectedIndex = (selectedIndex + 1) % Math.max(currentItems.length, 1);
                                renderList();
                                return true;
                            }
                            if (props.event.key === 'ArrowUp') {
                                selectedIndex = (selectedIndex - 1 + Math.max(currentItems.length, 1)) % Math.max(currentItems.length, 1);
                                renderList();
                                return true;
                            }
                            if (props.event.key === 'Enter') {
                                if (currentItems[selectedIndex]) {
                                    currentCommand?.(currentItems[selectedIndex]);
                                }
                                return true;
                            }
                            return false;
                        },
                        onExit: () => {
                            popup?.[0]?.destroy();
                            popup = null;
                        },
                    };
                },
                command: ({ editor, range, props }) => {
                    const item = props as MeNoteSearchResult;
                    editor
                        .chain()
                        .focus()
                        .insertContentAt(range, {
                            type: 'wikilink',
                            attrs: { noteId: item.id, label: item.name ?? 'Без названия' },
                        })
                        .run();
                },
            }),
        ];
    },
});
