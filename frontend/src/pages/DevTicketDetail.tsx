import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { DevTicketComments } from '../components/DevTicketComments';

interface Comment {
    id: number;
    content: string;
    author_id: number;
    author_name: string;
    created_at: string;
    updated_at: string;
}

interface DevTicket {
    id: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    reporter_id: number;
    reporter_name: string;
    assignee_id: number | null;
    assignee_name: string | null;
    created_at: string;
    updated_at: string;
    started_at: string | null;
    estimated_hours: number | null;
    actual_hours: number | null;
    comments: Comment[];
    can_assign: boolean;
    can_start: boolean;
    can_complete: boolean;
}

export const DevTicketDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState<DevTicket | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updating, setUpdating] = useState(false);

    const currentUserId = parseInt(localStorage.getItem('userId') || '0');

    useEffect(() => {
        fetchTicket();
    }, [id]);

    const fetchTicket = async () => {
        const token = localStorage.getItem('token');
        try {
            setLoading(true);
            const response = await fetch(`/api/dev-tickets/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.msg || 'Ошибка загрузки задачи');
            }
            const data = await response.json();
            setTicket(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!ticket) return;

        setUpdating(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/dev-tickets/${ticket.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                setTicket(prev => prev ? { ...prev, status: newStatus } : null);
            } else {
                const error = await response.json();
                alert(`Ошибка: ${error.msg}`);
            }
        } catch (err) {
            alert('Ошибка при обновлении статуса');
        } finally {
            setUpdating(false);
        }
    };

    const handleAssignToMe = async () => {
        if (!ticket) return;

        setUpdating(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/dev-tickets/${ticket.id}/assign`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // Обновляем локальное состояние
                setTicket(prev => prev ? { 
                    ...prev, 
                    assignee_id: currentUserId,
                    assignee_name: localStorage.getItem('username') || 'Вы'
                } : null);
            } else {
                const error = await response.json();
                alert(`Ошибка: ${error.msg}`);
            }
        } catch (err) {
            alert('Ошибка при назначении задачи');
        } finally {
            setUpdating(false);
        }
    };

    const handleCommentAdded = (comment: Comment) => {
        setTicket(prev => prev ? {
            ...prev,
            comments: [...prev.comments, comment]
        } : null);
    };

    const handleCommentUpdated = (commentId: number, content: string) => {
        setTicket(prev => prev ? {
            ...prev,
            comments: prev.comments.map(c => 
                c.id === commentId ? { ...c, content } : c
            )
        } : null);
    };

    const handleCommentDeleted = (commentId: number) => {
        setTicket(prev => prev ? {
            ...prev,
            comments: prev.comments.filter(c => c.id !== commentId)
        } : null);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'К выполнению': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
            case 'В работе': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'На проверке': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'Готово': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Низкий': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'Средний': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'Высокий': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
    };

    if (loading) return <div className="p-4">Загрузка...</div>;
    if (error) return <div className="p-4 text-red-500">{error}</div>;
    if (!ticket) return <div className="p-4">Задача не найдена</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Заголовок */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold dark:text-gray-200 mb-2">{ticket.title}</h1>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>#{ticket.id}</span>
                        <span>Создано: {new Date(ticket.created_at).toLocaleDateString('ru-RU')}</span>
                        <span>Автор: {ticket.reporter_name}</span>
                    </div>
                </div>
                <Button variant="secondary" onClick={() => navigate('/dev-tasks')}>
                    Назад к списку
                </Button>
            </div>

            {/* Статус и приоритет */}
            <div className="flex items-center space-x-4 mb-6">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                    {ticket.status}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                </span>
                {ticket.assignee_name && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        Исполнитель: {ticket.assignee_name}
                    </span>
                )}
            </div>

            {/* Действия */}
            <div className="flex flex-wrap gap-2 mb-6">
                {!ticket.assignee_id && (
                    <Button onClick={handleAssignToMe} disabled={updating}>
                        Взять в работу
                    </Button>
                )}
                
                {ticket.can_start && (
                    <Button onClick={() => handleStatusChange('В работе')} disabled={updating}>
                        Начать работу
                    </Button>
                )}
                
                {ticket.status === 'В работе' && ticket.can_complete && (
                    <Button onClick={() => handleStatusChange('На проверке')} disabled={updating}>
                        Готово к проверке
                    </Button>
                )}
                
                {ticket.status === 'На проверке' && ticket.can_complete && (
                    <Button onClick={() => handleStatusChange('Готово')} disabled={updating}>
                        Завершить
                    </Button>
                )}
            </div>

            {/* Описание */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-sm border dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4 dark:text-gray-200">Описание</h2>
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {ticket.description}
                </div>
            </div>

            {/* Дополнительная информация */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border dark:border-gray-700">
                    <h3 className="font-medium text-gray-900 dark:text-gray-200 mb-2">Оценка времени</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                        {ticket.estimated_hours ? `${ticket.estimated_hours} ч.` : 'Не указано'}
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border dark:border-gray-700">
                    <h3 className="font-medium text-gray-900 dark:text-gray-200 mb-2">Затрачено времени</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                        {ticket.actual_hours ? `${ticket.actual_hours} ч.` : 'Не указано'}
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border dark:border-gray-700">
                    <h3 className="font-medium text-gray-900 dark:text-gray-200 mb-2">Начало работы</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                        {ticket.started_at ? new Date(ticket.started_at).toLocaleDateString('ru-RU') : 'Не начато'}
                    </p>
                </div>
            </div>

            {/* Комментарии */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border dark:border-gray-700">
                <DevTicketComments
                    ticketId={ticket.id}
                    comments={ticket.comments}
                    currentUserId={currentUserId}
                    onCommentAdded={handleCommentAdded}
                    onCommentUpdated={handleCommentUpdated}
                    onCommentDeleted={handleCommentDeleted}
                />
            </div>
        </div>
    );
}; 