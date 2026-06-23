import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { DevTicketForm } from '../components/DevTicketForm'; // Импортируем форму

// TypeScript интерфейс для задачи
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
  can_assign: boolean;
  can_start: boolean;
  can_complete: boolean;
}

// Интерфейс для данных формы, которые мы отправляем
interface DevTicketFormData {
    id?: number;
    title: string;
    description: string;
    priority: string;
    status: string;
    assignee_id: number | null;
    estimated_hours?: number;
}

export const DevTasks: React.FC = () => {
  const [tickets, setTickets] = useState<DevTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<DevTicket | null>(null);
  const navigate = useNavigate();

  const currentUserId = parseInt(localStorage.getItem('userId') || '0');
  const isAdmin = localStorage.getItem('role') === 'admin';

  const fetchTickets = async () => {
    const token = localStorage.getItem('token');
    try {
      setLoading(true);
      const response = await fetch('/api/dev-tickets', { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.msg || 'Ошибка загрузки задач');
      }
      const data = await response.json();
      setTickets(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleOpenModal = (ticket: DevTicket | null = null) => {
    setEditingTicket(ticket);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTicket(null);
  };

  const handleSave = async (data: DevTicketFormData) => {
    const token = localStorage.getItem('token');
    const url = editingTicket ? `/api/dev-tickets/${editingTicket.id}` : '/api/dev-tickets';
    const method = editingTicket ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.msg || 'Не удалось сохранить задачу');
        }
        
        handleCloseModal();
        fetchTickets(); // Перезагружаем список после сохранения
    } catch (err: any) {
        alert(`Ошибка: ${err.message}`);
    }
  };

  const handleAssignToMe = async (ticketId: number) => {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/dev-tickets/${ticketId}/assign`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            fetchTickets(); // Перезагружаем список
        } else {
            const error = await response.json();
            alert(`Ошибка: ${error.msg}`);
        }
    } catch (err) {
        alert('Ошибка при назначении задачи');
    }
  };

  const handleStatusChange = async (ticketId: number, newStatus: string) => {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/dev-tickets/${ticketId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            fetchTickets(); // Перезагружаем список
        } else {
            const error = await response.json();
            alert(`Ошибка: ${error.msg}`);
        }
    } catch (err) {
        alert('Ошибка при изменении статуса');
    }
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

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-gray-200">Задачи для разработки</h1>
        <Button onClick={() => handleOpenModal()}>Создать задачу</Button>
      </div>

       <div className="overflow-x-auto shadow-md sm:rounded-lg border dark:border-gray-700">
        <table className="w-full bg-white dark:bg-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Название</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Статус</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Приоритет</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Исполнитель</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Автор</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {tickets.length > 0 ? (
              tickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{ticket.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    <button 
                      onClick={() => navigate(`/dev-tasks/${ticket.id}`)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      {ticket.title}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {ticket.assignee_name || 'Не назначен'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{ticket.reporter_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/dev-tasks/${ticket.id}`)}>
                      Просмотр
                    </Button>
                    
                    {/* Кнопка "Взять в работу" */}
                    {!ticket.assignee_id && (
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => handleAssignToMe(ticket.id)}
                      >
                        Взять
                      </Button>
                    )}
                    
                    {/* Кнопки изменения статуса */}
                    {ticket.can_start && (
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => handleStatusChange(ticket.id, 'В работе')}
                      >
                        Начать
                      </Button>
                    )}
                    
                    {ticket.status === 'В работе' && ticket.can_complete && (
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => handleStatusChange(ticket.id, 'На проверке')}
                      >
                        Готово
                      </Button>
                    )}
                    
                    {ticket.status === 'На проверке' && ticket.can_complete && (
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => handleStatusChange(ticket.id, 'Готово')}
                      >
                        Завершить
                      </Button>
                    )}
                    
                    {/* Кнопка редактирования только для админа или автора */}
                    {(isAdmin || ticket.reporter_id === currentUserId) && (
                      <Button size="sm" variant="secondary" onClick={() => handleOpenModal(ticket)}>
                        Ред.
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Задач пока нет.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingTicket ? 'Редактировать задачу' : 'Создать задачу'}>
            <DevTicketForm 
                ticket={editingTicket ? {
                    id: editingTicket.id,
                    title: editingTicket.title,
                    description: editingTicket.description,
                    priority: editingTicket.priority,
                    status: editingTicket.status,
                    assignee_id: editingTicket.assignee_id,
                    estimated_hours: editingTicket.estimated_hours || undefined
                } : null}
                onSave={handleSave}
                onClose={handleCloseModal}
            />
        </Modal>
      )}
    </div>
  );
}; 