import React, { useState, useEffect } from 'react';

interface Vacation {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  vacation_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  username: string;
  role: string;
}

const VacationSchedule: React.FC = () => {
  const token = localStorage.getItem("token");
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVacation, setEditingVacation] = useState<Vacation | null>(null);
  const [formData, setFormData] = useState({
    user_id: '',
    start_date: '',
    end_date: '',
    vacation_type: 'ANNUAL_LEAVE',
    status: 'ACTIVE'
  });

  useEffect(() => {
    fetchVacations();
    fetchUsers();
  }, []);

  const fetchVacations = async () => {
    try {
      const response = await fetch('/api/v1/vacation-schedule/?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setVacations(data);
      }
    } catch (error) {
      console.error('Error fetching vacations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/v1/user/?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const url = editingVacation
      ? `/api/v1/vacation-schedule/${editingVacation.id}`
      : '/api/v1/vacation-schedule/';

    const method = editingVacation ? 'PATCH' : 'POST';
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setShowForm(false);
        setEditingVacation(null);
        setFormData({
          user_id: '',
          start_date: '',
          end_date: '',
          vacation_type: 'ANNUAL_LEAVE',
          status: 'ACTIVE'
        });
        fetchVacations();
      } else {
        const error = await response.json();
        alert(error.detail || 'Error saving vacation schedule');
      }
    } catch (error) {
      console.error('Error saving vacation:', error);
      alert('Error saving vacation schedule');
    }
  };

  const handleEdit = (vacation: Vacation) => {
    setEditingVacation(vacation);
    setFormData({
      user_id: vacation.user_id.toString(),
      start_date: vacation.start_date,
      end_date: vacation.end_date,
      vacation_type: vacation.vacation_type,
      status: vacation.status
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this vacation schedule?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/v1/vacation-schedule/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        fetchVacations();
      } else {
        alert('Error deleting vacation schedule');
      }
    } catch (error) {
      console.error('Error deleting vacation:', error);
      alert('Error deleting vacation schedule');
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'ACTIVE' ? 'text-green-600' : 'text-red-600';
  };

  const getVacationTypeColor = (type: string) => {
    switch (type) {
      case 'ANNUAL_LEAVE': return 'text-blue-600';
      case 'SICK_LEAVE': return 'text-red-600';
      case 'BUSINESS_TRIP': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getVacationTypeLabel = (type: string) => {
    switch (type) {
      case 'ANNUAL_LEAVE': return 'Отпуск';
      case 'SICK_LEAVE': return 'Больничный';
      case 'BUSINESS_TRIP': return 'Командировка';
      default: return type;
    }
  };

  const getUsername = (userId: number) =>
    users.find(u => u.id === userId)?.username || `#${userId}`;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Расписание отпусков
            </h2>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingVacation(null);
                setFormData({
                  user_id: '',
                  start_date: '',
                  end_date: '',
                  vacation_type: 'ANNUAL_LEAVE',
                  status: 'ACTIVE'
                });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Добавить отпуск
            </button>
          </div>

          {showForm && (
            <div className="mb-6 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
              <h3 className="text-lg font-medium mb-4">
                {editingVacation ? 'Редактировать отпуск' : 'Добавить отпуск'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Сотрудник
                    </label>
                    <select
                      value={formData.user_id}
                      onChange={(e) => setFormData({...formData, user_id: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">Выберите сотрудника</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.username}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Тип отпуска
                    </label>
                    <select
                      value={formData.vacation_type}
                      onChange={(e) => setFormData({...formData, vacation_type: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="ANNUAL_LEAVE">Отпуск</option>
                      <option value="SICK_LEAVE">Больничный</option>
                      <option value="BUSINESS_TRIP">Командировка</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Дата начала
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Дата окончания
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Статус
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="ACTIVE">Активный</option>
                      <option value="CANCELLED">Отменен</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingVacation(null);
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                  >
                    {editingVacation ? 'Обновить' : 'Добавить'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Сотрудник
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Дата начала
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Дата окончания
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {vacations.map((vacation) => (
                  <tr key={vacation.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {getUsername(vacation.user_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${getVacationTypeColor(vacation.vacation_type)}`}>
                        {getVacationTypeLabel(vacation.vacation_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(vacation.start_date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(vacation.end_date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${getStatusColor(vacation.status)}`}>
                        {vacation.status === 'ACTIVE' ? 'Активный' : 'Отменен'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(vacation)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDelete(vacation.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {vacations.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Нет записей об отпусках
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VacationSchedule; 