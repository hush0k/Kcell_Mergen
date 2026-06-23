import React, { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';

interface Comment {
    id: number;
    content: string;
    author_id: number;
    author_name: string;
    created_at: string;
    updated_at: string;
}

interface DevTicketCommentsProps {
    ticketId: number;
    comments: Comment[];
    currentUserId: number;
    onCommentAdded: (comment: Comment) => void;
    onCommentUpdated: (commentId: number, content: string) => void;
    onCommentDeleted: (commentId: number) => void;
}

export const DevTicketComments: React.FC<DevTicketCommentsProps> = ({
    ticketId,
    comments,
    currentUserId,
    onCommentAdded,
    onCommentUpdated,
    onCommentDeleted
}) => {
    const [newComment, setNewComment] = useState('');
    const [editingComment, setEditingComment] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/dev-tickets/${ticketId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: newComment })
            });

            if (response.ok) {
                const data = await response.json();
                onCommentAdded(data.comment);
                setNewComment('');
            } else {
                const error = await response.json();
                alert(`Ошибка: ${error.msg}`);
            }
        } catch (err) {
            alert('Ошибка при добавлении комментария');
        } finally {
            setLoading(false);
        }
    };

    const handleStartEdit = (comment: Comment) => {
        setEditingComment(comment.id);
        setEditContent(comment.content);
    };

    const handleUpdateComment = async (commentId: number) => {
        if (!editContent.trim()) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/dev-tickets/${ticketId}/comments/${commentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: editContent })
            });

            if (response.ok) {
                onCommentUpdated(commentId, editContent);
                setEditingComment(null);
                setEditContent('');
            } else {
                const error = await response.json();
                alert(`Ошибка: ${error.msg}`);
            }
        } catch (err) {
            alert('Ошибка при обновлении комментария');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteComment = async (commentId: number) => {
        // eslint-disable-next-line no-restricted-globals
        if (!confirm('Удалить комментарий?')) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/dev-tickets/${ticketId}/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                onCommentDeleted(commentId);
            } else {
                const error = await response.json();
                alert(`Ошибка: ${error.msg}`);
            }
        } catch (err) {
            alert('Ошибка при удалении комментария');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('ru-RU');
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold dark:text-gray-200">Комментарии</h3>
            
            {/* Форма добавления комментария */}
            <form onSubmit={handleAddComment} className="space-y-2">
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Добавить комментарий..."
                    rows={3}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={loading}
                />
                <div className="flex justify-end">
                    <Button type="submit" disabled={loading || !newComment.trim()}>
                        {loading ? 'Добавление...' : 'Добавить комментарий'}
                    </Button>
                </div>
            </form>

            {/* Список комментариев */}
            <div className="space-y-4">
                {comments.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        Комментариев пока нет
                    </p>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} className="border rounded-lg p-4 dark:border-gray-600">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="font-medium dark:text-gray-200">
                                        {comment.author_name}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                        {formatDate(comment.created_at)}
                                    </span>
                                </div>
                                <div className="flex space-x-2">
                                    {comment.author_id === currentUserId && (
                                        <>
                                            {editingComment === comment.id ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => handleUpdateComment(comment.id)}
                                                        disabled={loading}
                                                    >
                                                        Сохранить
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => {
                                                            setEditingComment(null);
                                                            setEditContent('');
                                                        }}
                                                        disabled={loading}
                                                    >
                                                        Отмена
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleStartEdit(comment)}
                                                    disabled={loading}
                                                >
                                                    Ред.
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleDeleteComment(comment.id)}
                                                disabled={loading}
                                            >
                                                Удал.
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            {editingComment === comment.id ? (
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    rows={3}
                                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    disabled={loading}
                                />
                            ) : (
                                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {comment.content}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}; 