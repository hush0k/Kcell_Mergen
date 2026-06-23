import React from 'react';

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

interface AlarmDetailProps {
  alarm: Alarm;
  onClose: () => void;
}

export const AlarmDetail: React.FC<AlarmDetailProps> = ({
  alarm,
  onClose
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isHTMLContent = (text: string): boolean => {
    // Проверяем, содержит ли текст HTML теги
    const htmlRegex = /<[^>]*>/;
    return htmlRegex.test(text);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Детали уведомления
            </h2>
            {getStatusBadge(alarm.status)}
            {getTypeBadge(alarm.notif_type)}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Отправитель
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  {alarm.sender}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Дата создания
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  {formatDate(alarm.creating_dt)}
                </p>
              </div>

              {alarm.processing_dt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Дата обработки
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    {formatDate(alarm.processing_dt)}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Тип уведомления
                </label>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  {getTypeBadge(alarm.notif_type)}
                </div>
              </div>

              {alarm.recipients_count && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Количество получателей
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    {alarm.recipients_count}
                  </p>
                </div>
              )}

              {alarm.error_msg && (
                <div>
                  <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                    Ошибка
                  </label>
                  <p className="text-sm text-red-900 dark:text-red-100 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                    {alarm.error_msg}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          {alarm.title && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Заголовок
              </label>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                {alarm.title}
              </h3>
            </div>
          )}

          {/* Message */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Сообщение
            </label>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              {isHTMLContent(alarm.msg_text) ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      HTML контент обнаружен
                    </span>
                    <button
                      onClick={() => {
                        // Открываем HTML контент в новом окне через API
                        const token = localStorage.getItem('token');
                        const url = `/api/alarms/${alarm.id}/html`;
                        const newWindow = window.open('', '_blank', 'width=800,height=600');
                        
                        if (newWindow) {
                          // Загружаем HTML через API
                          fetch(url, {
                            headers: {
                              'Authorization': `Bearer ${token}`
                            }
                          })
                          .then(response => response.text())
                          .then(html => {
                            newWindow.document.write(html);
                            newWindow.document.close();
                          })
                          .catch(error => {
                            console.error('Ошибка загрузки HTML:', error);
                            newWindow.document.write('<h1>Ошибка загрузки</h1><p>Не удалось загрузить HTML контент.</p>');
                            newWindow.document.close();
                          });
                        }
                      }}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Открыть в новом окне
                    </button>
                  </div>
                  <div className="border border-gray-300 rounded p-4 bg-white overflow-auto">
                    <div 
                      className="text-sm text-gray-900 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: alarm.msg_text }}
                      style={{ 
                        fontFamily: 'Arial, sans-serif',
                        lineHeight: '1.5'
                      }}
                    />
                    <div className="mt-4 p-2 bg-green-100 border border-green-300 rounded">
                      <p className="text-xs text-green-800 mb-2">
                        <strong>Тест dangerouslySetInnerHTML:</strong>
                      </p>
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: '<h2 style="color: red;">Тест работает!</h2><p style="color: blue;">Если вы видите этот текст красным и синим, то dangerouslySetInnerHTML работает.</p>' 
                        }}
                      />
                    </div>
                    <div className="mt-4 p-2 bg-yellow-100 border border-yellow-300 rounded">
                      <p className="text-xs text-yellow-800">
                        <strong>Отладка:</strong> HTML контент должен отображаться выше. 
                        Если видите код вместо HTML, обновите страницу (Ctrl+F5).
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                  {alarm.msg_text}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
