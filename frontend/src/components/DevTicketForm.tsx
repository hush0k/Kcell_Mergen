import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';

interface DevTicketData {
    id?: number;
    title: string;
    description: string;
    priority: string;
    status: string;
    assignee_id: number | null;
    estimated_hours?: number;
}

interface User {
    id: number;
    username: string;
    role: string;
}

interface DevTicketFormProps {
    ticket?: DevTicketData | null;
    onSave: (data: DevTicketData) => void;
    onClose: () => void;
}

const priorities = ['Низкий', 'Средний', 'Высокий'];
const statuses = ['К выполнению', 'В работе', 'На проверке', 'Готово'];

export const DevTicketForm: React.FC<DevTicketFormProps> = ({ ticket, onSave, onClose }) => {
    const [formData, setFormData] = useState<DevTicketData>({
        id: ticket?.id,
        title: ticket?.title || '',
        description: ticket?.description || '',
        priority: ticket?.priority || 'Средний',
        status: ticket?.status || 'К выполнению',
        assignee_id: ticket?.assignee_id || null,
        estimated_hours: ticket?.estimated_hours || undefined,
    });
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const isAdmin = localStorage.getItem('role') === 'admin';

    useEffect(() => {
        // Загружаем только админов для назначения
        const fetchAdmins = async () => {
            const token = localStorage.getItem('token');
            try {
                const response = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` }});
                const allUsers = await response.json();
                if (Array.isArray(allUsers)) {
                    setUsers(allUsers.filter(u => u.role === 'admin'));
                }
            } catch (e) {
                console.error("Failed to fetch users", e);
            }
        };

        if (isAdmin) {
            fetchAdmins();
        }
    }, [isAdmin]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'assignee_id' ? (value ? parseInt(value, 10) : null) : 
                    name === 'estimated_hours' ? (value ? parseInt(value, 10) : undefined) : value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.description) {
            setError('Заголовок и описание обязательны.');
            return;
        }
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-500">{error}</p>}
            <div>
                <label className="block text-sm font-medium dark:text-gray-300">Заголовок</label>
                <Input name="title" value={formData.title} onChange={handleChange} required />
            </div>
            <div>
                <label className="block text-sm font-medium dark:text-gray-300">Описание</label>
                <textarea 
                    name="description" 
                    value={formData.description} 
                    onChange={handleChange} 
                    required 
                    rows={6}
                    className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium dark:text-gray-300">Приоритет</label>
                    <Select name="priority" value={formData.priority} onChange={handleChange}>
                        {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                    </Select>
                </div>
                <div>
                    <label className="block text-sm font-medium dark:text-gray-300">Статус</label>
                    <Select name="status" value={formData.status} onChange={handleChange}>
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                </div>
                <div>
                    <label className="block text-sm font-medium dark:text-gray-300">Оценка времени (часы)</label>
                    <Input 
                        name="estimated_hours" 
                        type="number" 
                        min="0"
                        value={formData.estimated_hours || ''} 
                        onChange={handleChange}
                        placeholder="Например: 8"
                    />
                </div>
            </div>
            {isAdmin && (
                 <div>
                    <label className="block text-sm font-medium dark:text-gray-300">Исполнитель (Админ)</label>
                    <Select name="assignee_id" value={formData.assignee_id || ''} onChange={handleChange}>
                        <option value="">Не назначен</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                    </Select>
                </div>
            )}
            <div className="flex justify-end pt-4 gap-2">
                <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Сохранение...' : 'Сохранить'}</Button>
            </div>
        </form>
    );
}; 