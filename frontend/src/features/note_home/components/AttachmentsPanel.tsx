import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api/resources";
import { ApiError } from "@/api/client";
import type { AttachmentResponse } from "@/types/api";
import { FiUploadCloud, FiFile, FiFileText, FiImage, FiTrash2 } from "react-icons/fi";

interface Props {
    noteId: number;
    canEdit: boolean;
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
    if (mimeType.startsWith("image/")) return <FiImage size={18} className="shrink-0 text-mg-purple" />;
    if (mimeType === "application/pdf" || mimeType.startsWith("text/")) return <FiFileText size={18} className="shrink-0 text-mg-purple" />;
    return <FiFile size={18} className="shrink-0 text-mg-purple" />;
}

export function AttachmentsPanel({ noteId, canEdit }: Props) {
    const [attachments, setAttachments] = useState<AttachmentResponse[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [openingId, setOpeningId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const dragCounter = useRef(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadAttachments = useCallback(() => {
        api.meNote.attachments.list(noteId)
            .then(setAttachments)
            .catch((e) => console.error(e));
    }, [noteId]);

    useEffect(() => {
        loadAttachments();
    }, [loadAttachments]);

    const uploadFiles = async (fileList: FileList | File[]) => {
        const files = Array.from(fileList);
        if (files.length === 0) return;
        setError(null);
        setUploading(true);
        try {
            await api.meNote.attachments.upload(noteId, files);
            loadAttachments();
        } catch (e) {
            const message = e instanceof ApiError ? e.message : "Не удалось загрузить файлы";
            setError(message);
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        dragCounter.current = 0;
        setIsDragging(false);
        if (!canEdit) return;
        if (e.dataTransfer.files?.length) {
            uploadFiles(e.dataTransfer.files);
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!canEdit) return;
        dragCounter.current += 1;
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        dragCounter.current -= 1;
        if (dragCounter.current <= 0) {
            dragCounter.current = 0;
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handlePick = () => {
        if (!canEdit) return;
        fileInputRef.current?.click();
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            uploadFiles(e.target.files);
        }
        e.target.value = "";
    };

    const handleOpen = async (attachment: AttachmentResponse) => {
        setOpeningId(attachment.id);
        try {
            await api.meNote.attachments.openFile(noteId, attachment.id);
        } catch (e) {
            console.error(e);
            setError("Не удалось открыть файл");
        } finally {
            setOpeningId(null);
        }
    };

    const handleDelete = async (e: React.MouseEvent, attachmentId: number) => {
        e.stopPropagation();
        if (!canEdit) return;
        try {
            await api.meNote.attachments.remove(noteId, attachmentId);
            setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
        } catch (err) {
            console.error(err);
            setError("Не удалось удалить файл");
        }
    };

    return (
        <div className="h-full w-full flex flex-col py-6 px-4 space-y-4 overflow-hidden">
            <p className="text-sm font-semibold text-mg-text-2 shrink-0">Файлы</p>

            <div
                onClick={handlePick}
                onDrop={handleDrop}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                className={`shrink-0 rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 py-6 px-3 text-center ${
                    !canEdit
                        ? "border-mg-text-3 opacity-50 cursor-not-allowed"
                        : isDragging
                            ? "border-mg-purple bg-mg-purple-soft-2"
                            : "border-mg-text-3 hover:border-mg-purple hover:bg-mg-purple-soft-2"
                }`}
            >
                <FiUploadCloud size={24} className="text-mg-purple" />
                <p className="text-xs font-medium text-mg-text-2">
                    {uploading ? "Загрузка..." : "Перетащите файлы сюда или нажмите"}
                </p>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    disabled={!canEdit}
                    onChange={handleFileInputChange}
                />
            </div>

            {error && (
                <p className="text-xs font-medium text-mg-danger-fg shrink-0">{error}</p>
            )}

            <ul className="flex-1 min-h-0 overflow-y-auto space-y-1">
                {attachments.length === 0 && (
                    <li className="text-xs text-mg-text-3 text-center py-4">Нет прикреплённых файлов</li>
                )}
                {attachments.map((attachment) => (
                    <li
                        key={attachment.id}
                        onClick={() => handleOpen(attachment)}
                        className="group flex flex-row items-center gap-2 py-2 px-2.5 rounded-lg hover:bg-mg-purple-soft-2 cursor-pointer transition-colors"
                    >
                        <FileIcon mimeType={attachment.mime_type} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-mg-text truncate">
                                {openingId === attachment.id ? "Открытие..." : attachment.original_name}
                            </p>
                            <p className="text-xs text-mg-text-3">{formatSize(attachment.size_bytes)}</p>
                        </div>
                        {canEdit && (
                            <button
                                onClick={(e) => handleDelete(e, attachment.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-mg-danger-fg hover:bg-mg-danger-bg shrink-0"
                            >
                                <FiTrash2 size={14} />
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
