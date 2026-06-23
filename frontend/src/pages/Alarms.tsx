import React, { useState, useEffect } from 'react';
import { AlarmDetail } from '../components/AlarmDetail';

interface Alarm {
  id: number;
  notif_type: string;
  sender: string;
  title: string | null;
  msg_text: string;
  creating_dt: string;
  processing_dt: string | null;
  status: 'N' | 'R' | 'P';
  error_msg: string | null;
  recipients_count?: number;
}

export const Alarms: React.FC = () => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedAlarm, setSelectedAlarm] = useState<Alarm | null>(null);

  useEffect(() => {
    fetchAlarms();
  }, []);

  const fetchAlarms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/alarms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setAlarms(data);
    } catch (error) {
      console.error('Error fetching alarms:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alarmId: number) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `/api/alarms/${alarmId}/read`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      fetchAlarms();
    } catch (error) {
      console.error('Error marking alarm as read:', error);
    }
  };

  const filteredAlarms = alarms.filter(alarm => {
    if (filter === 'unread') return alarm.status === 'N';
    if (filter === 'read') return alarm.status === 'R' || alarm.status === 'P';
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'N': { text: 'Новое', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      'R': { text: 'Прочитано', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      'P': { text: 'Обработано', className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['N'];
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.text}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      'WEB': { text: 'Веб', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
      'SMS': { text: 'SMS', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      'EMAIL': { text: 'Email', className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' }
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || { text: type, className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.text}
      </span>
    );
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    // Если это HTML контент, извлекаем только текст
    if (isHTMLContent(text)) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = text;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      if (plainText.length <= maxLength) return plainText;
      return plainText.substring(0, maxLength) + '...';
    }
    
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const isHTMLContent = (text: string): boolean => {
    // Проверяем, содержит ли текст HTML теги
    const htmlRegex = /<[^>]*>/;
    return htmlRegex.test(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Алармы и уведомления
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Все ({alarms.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Непрочитанные ({alarms.filter(a => a.status === 'N').length})
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                filter === 'read'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Прочитанные ({alarms.filter(a => a.status !== 'N').length})
            </button>
          </div>
        </div>

        {filteredAlarms.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-gray-400 dark:text-gray-600 mb-4 text-6xl">
              🔔
            </div>
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
              Нет уведомлений
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filter === 'unread'
                ? 'У вас нет непрочитанных уведомлений'
                : filter === 'read'
                ? 'У вас нет прочитанных уведомлений'
                : 'У вас пока нет уведомлений'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlarms.map(alarm => (
              <div
                key={alarm.id}
                className={`border rounded-lg p-5 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  alarm.status === 'N'
                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                    : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                }`}
                onClick={() => {
                  setSelectedAlarm(alarm);
                  // Автоматически помечаем как прочитанное при открытии модалки
                  if (alarm.status === 'N') {
                    markAsRead(alarm.id);
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-3">
                      {getStatusBadge(alarm.status)}
                      {getTypeBadge(alarm.notif_type)}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(alarm.creating_dt)}
                      </span>
                      {alarm.recipients_count && alarm.recipients_count > 1 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                          {alarm.recipients_count} получателей
                        </span>
                      )}
                    </div>
                    
                    {alarm.title && (
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                        {alarm.title}
                      </h3>
                    )}
                    
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">
                      {truncateText(alarm.msg_text)}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        {alarm.sender}
                      </span>
                    </div>
                  </div>
                  
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal для детального просмотра аларма */}
      {selectedAlarm && (
        <AlarmDetail
          alarm={selectedAlarm}
          onClose={() => setSelectedAlarm(null)}
        />
      )}
    </div>
  );
};
