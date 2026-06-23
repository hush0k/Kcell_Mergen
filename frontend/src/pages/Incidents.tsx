import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Modal } from '../components/Modal';
import { IncidentForm } from '../components/IncidentForm';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';

// Определим тип для инцидента, чтобы было удобнее работать
export interface Incident {
    id: number;
    username: string;
    status: string;
    control_type: string;
    control_subtype: string;
    risk?: string;
    category?: string;
    problem_area?: string;
    detected_source: string;
    reporting_month: string;
    occurrence_date: string;
    solution_date?: string;
    close_date?: string;
    incident_name?: string;
    description?: string;
    taken_measures?: string;
    root_cause?: string;
    estimated_loss?: number;
    opportunity_loss?: number;
    bad_debt?: number;
    prevented_savings?: number;
    recovered_savings?: number;
    overchange?: number;
    service_abused?: string;
    count_fraudulent_numbers?: number;
    case_type: string;
    attachment?: string;
    created_at: string;
    kpi_calculation?: number;
    confirmed_fraud?: string;
    task_id: number;
}

export const Incidents: React.FC = () => {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Состояния для фильтров с сохранением в sessionStorage
    const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('incidents_searchTerm') || '');
    const [statusFilter, setStatusFilter] = useState(() => sessionStorage.getItem('incidents_statusFilter') || '');
    const [dateFromFilter, setDateFromFilter] = useState(() => sessionStorage.getItem('incidents_dateFromFilter') || '');
    const [dateToFilter, setDateToFilter] = useState(() => sessionStorage.getItem('incidents_dateToFilter') || '');

    const fetchIncidents = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Вы не авторизованы');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await fetch('/api/v1/incidents/?limit=1000', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Не удалось загрузить инциденты');
            }

            const data = await response.json();
            setIncidents(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchIncidents();
    }, [fetchIncidents]);

    // Эффект для сохранения фильтров в sessionStorage при их изменении
    useEffect(() => {
        sessionStorage.setItem('incidents_searchTerm', searchTerm);
        sessionStorage.setItem('incidents_statusFilter', statusFilter);
        sessionStorage.setItem('incidents_dateFromFilter', dateFromFilter);
        sessionStorage.setItem('incidents_dateToFilter', dateToFilter);
    }, [searchTerm, statusFilter, dateFromFilter, dateToFilter]);

    // Логика фильтрации
    const filteredIncidents = useMemo(() => {
        return incidents
            .filter(incident => {
                // Фильтр по статусу
                if (statusFilter && incident.status !== statusFilter) {
                    return false;
                }
                
                // Фильтр по дате
                const incidentDate = incident.created_at.split('T')[0];
                if (dateFromFilter && incidentDate < dateFromFilter) {
                    return false;
                }
                if (dateToFilter && incidentDate > dateToFilter) {
                    return false;
                }
                
                return true;
            })
            .filter(incident => {
                // Фильтр по поисковому запросу
                if (!searchTerm) {
                    return true;
                }
                const lowerCaseSearchTerm = searchTerm.toLowerCase();
                return (
                    incident.id.toString().includes(lowerCaseSearchTerm) ||
                    (incident.incident_name || '').toLowerCase().includes(lowerCaseSearchTerm) ||
                    incident.username.toLowerCase().includes(lowerCaseSearchTerm)
                );
            });
    }, [incidents, searchTerm, statusFilter, dateFromFilter, dateToFilter]);

    const handleViewClick = (incident: Incident) => {
        setSelectedIncident(incident);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedIncident(null);
        fetchIncidents(); 
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!selectedIncident) return;

        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`/api/v1/incidents/${selectedIncident.id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                 const errData = await response.json();
                throw new Error(errData.detail || 'Не удалось изменить статус');
            }

            alert(`Статус инцидента изменен на "${newStatus}"`);
            handleCloseModal();
        } catch (err: any) {
            setError(err.message);
            alert(`Ошибка: ${err.message}`);
        }
    };

    if (loading) return <div>Загрузка инцидентов...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h2 className="text-2xl font-bold mb-6 dark:text-gray-200">Список инцидентов</h2>

            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border dark:bg-gray-800 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Поиск</label>
                        <Input
                            type="text"
                            placeholder="ID, название, автор..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Статус</label>
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">Все статусы</option>
                            <option value="Открыт">Открыт</option>
                            <option value="На согласовании">На согласовании</option>
                            <option value="Согласован">Согласован</option>
                            <option value="Отклонён">Отклонён</option>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Дата создания (с)</label>
                        <Input
                            type="date"
                            value={dateFromFilter}
                            onChange={(e) => setDateFromFilter(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Дата создания (по)</label>
                        <Input
                            type="date"
                            value={dateToFilter}
                            onChange={(e) => setDateToFilter(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto shadow-md sm:rounded-lg border dark:border-gray-700">
                <table className="w-full bg-white dark:bg-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Название</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Статус</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ответственный</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Дата создания</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredIncidents.length > 0 ? (
                            filteredIncidents.map(incident => (
                                <tr key={incident.id} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{incident.id}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{incident.incident_name}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{incident.status}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{incident.username}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{new Date(incident.created_at).toLocaleDateString()}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                                        <Button onClick={() => handleViewClick(incident)} variant="secondary" size="sm">Просмотр</Button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    {incidents.length > 0 ? "Инциденты не найдены по заданным фильтрам" : "Инциденты не найдены"}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && selectedIncident && (
                <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={`Инцидент #${selectedIncident.id}: ${selectedIncident.incident_name}`}>
                    <IncidentForm 
                        isEditMode={true}
                        incidentData={selectedIncident}
                        onClose={handleCloseModal}
                        onStatusChange={handleStatusChange}
                    />
                </Modal>
            )}
        </div>
    );
}; 