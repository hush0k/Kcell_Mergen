import React, { useState, useEffect } from 'react';
import { Input } from './Input';
import { Button } from './Button';

interface IncidentFormProps {
  taskId?: number;
  incidentData?: any;
  onClose: () => void;
  isEditMode: boolean;
  onStatusChange?: (newStatus: string) => void;
}

interface IncidentState {
  id?: number;
  status: string;
  control_type: string;
  control_subtype: string;
  risk: string;
  category: string;
  problem_area: string;
  detected_source: string;
  reporting_month: string;
  occurrence_date: string;
  solution_date: string;
  close_date: string;
  incident_name: string;
  description: string;
  taken_measures: string;
  root_cause: string;
  estimated_loss: number;
  opportunity_loss: number;
  bad_debt: number;
  prevented_savings: number;
  recovered_savings: number;
  overchange: number;
  service_abused: string;
  count_fraudulent_numbers: number;
  case_type: string;
  attachment: string;
  kpi_calculation: number;
  confirmed_fraud: string;
  task_id?: number;
}

const initialIncidentState: IncidentState = {
  id: undefined,
    status: 'Открыт',
    control_type: '',
    control_subtype: '',
    risk: '',
    category: '',
    problem_area: '',
    detected_source: '',
    reporting_month: new Date().toISOString().slice(0, 10),
    occurrence_date: '',
    solution_date: '',
    close_date: '',
    incident_name: '',
    description: '',
    taken_measures: '',
    root_cause: '',
    estimated_loss: 0,
    opportunity_loss: 0,
    bad_debt: 0,
    prevented_savings: 0,
    recovered_savings: 0,
    overchange: 0,
    service_abused: '',
    count_fraudulent_numbers: 0,
    case_type: 'regular',
    attachment: '',
    kpi_calculation: 0,
    confirmed_fraud: 'Нет',
  task_id: undefined,
};

export const IncidentForm: React.FC<IncidentFormProps> = ({ taskId, incidentData, onClose, isEditMode, onStatusChange }) => {
  const [incident, setIncident] = useState(initialIncidentState);

  useEffect(() => {
    if (isEditMode && incidentData) {
        const formattedData = { ...incidentData };
        ['occurrence_date', 'solution_date', 'close_date', 'reporting_month'].forEach(field => {
            if (formattedData[field]) {
                formattedData[field] = new Date(formattedData[field]).toISOString().split('T')[0];
            }
        });
      setIncident(formattedData);
    } else {
      const controlArea = incidentData?.control?.area || incidentData?.controlArea || '';
      setIncident({
        ...initialIncidentState,
        task_id: taskId,
        control_type: controlArea,
        control_subtype: controlArea ? `${controlArea}_` : '',
      });
    }
  }, [incidentData, isEditMode, taskId]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const userRole = localStorage.getItem('role');
  const [file, setFile] = useState<File | null>(null);

  // Определяем, можно ли редактировать инцидент
  const isEditable = !isEditMode || incident.status === 'Открыт';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!isEditable) return; // Блокируем изменения если не редактируемый
    
    const { name, value } = e.target;
    const isNumber = (e.target as HTMLInputElement).type === 'number';
    setIncident((prev: any) => ({ ...prev, [name]: isNumber ? parseFloat(value) : value }));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditable) return;
    if (e.target.files && e.target.files[0]) {
        setFile(e.target.files[0]);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isEditable) {
      setError('Инцидент не может быть отредактирован в текущем статусе');
      return;
    }
    
    setLoading(true);
    setError('');

    const requiredFields: (keyof typeof initialIncidentState)[] = ['control_type', 'control_subtype', 'occurrence_date', 'incident_name', 'description', 'detected_source'];
    for(const field of requiredFields) {
        if (!incident[field]) {
            setError(`Поле "${field}" обязательно для заполнения.`);
            setLoading(false);
            return;
        }
    }
    
    const token = localStorage.getItem('token');
    const url = isEditMode && incident.id ? `/api/v1/incidents/${incident.id}` : '/api/v1/incidents/';
    const method = isEditMode ? 'PATCH' : 'POST';

    const response = await fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(incident)
    });

    setLoading(false);

    if (response.ok) {
        alert(isEditMode ? 'Инцидент успешно обновлен!' : 'Инцидент успешно создан!');
        onClose();
    } else {
        const errData = await response.json();
        setError(errData.detail || 'Произошла ошибка');
    }
  };

  const handleDownload = async (filename: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Ошибка авторизации');
        return;
    }
    try {
        const response = await fetch(`/api/download/${filename}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Не удалось скачать файл. Возможно, он был удален.');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

    } catch (error: any) {
        alert(error.message);
    }
  };

  const handleStatusChangeClick = (newStatus: string) => {
    if (onStatusChange) {
        onStatusChange(newStatus);
    }
  };

  const renderField = (label: string, name: keyof typeof initialIncidentState, type = 'text', options: string[] = []) => {
    const commonClasses = "border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400";
    const disabledClasses = "disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-600";
    const required = isEditable && requiredFields.includes(name);

    return (
        <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{label}</label>
            {type === 'select' ? (
                <select 
                    name={name} 
                    value={incident[name] as string} 
                    onChange={handleChange} 
                    disabled={!isEditable}
                    className={`${commonClasses} ${disabledClasses}`} 
                    required={required}
                >
                    <option value="">Выберите...</option>
                    {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            ) : type === 'textarea' ? (
                <textarea 
                    name={name} 
                    value={incident[name] as string} 
                    onChange={handleChange} 
                    disabled={!isEditable}
                    className={`${commonClasses} ${disabledClasses} h-24`} 
                    required={required}
                ></textarea>
            ) : (
                <Input 
                    type={type} 
                    name={name} 
                    value={incident[name] as any} 
                    onChange={handleChange} 
                    disabled={!isEditable}
                    required={required} 
                />
            )}
        </div>
    );
  };
  
  const requiredFields: (keyof typeof initialIncidentState)[] = ['control_type', 'control_subtype', 'occurrence_date', 'incident_name', 'description', 'detected_source'];

  // Показываем предупреждение если инцидент не редактируемый
  const renderStatusWarning = () => {
    if (isEditMode && !isEditable) {
      return (
        <div className="bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-900/50 dark:border-yellow-600/50 dark:text-yellow-300 px-4 py-3 rounded mb-4">
          <strong>Внимание:</strong> Инцидент находится в статусе "{incident.status}". Редактирование полей заблокировано.
        </div>
      );
    }
    return null;
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && <div className="bg-red-100 border-red-400 text-red-700 dark:bg-red-900/50 dark:text-red-300 px-4 py-3 rounded mb-4 text-sm">{error}</div>}
      {renderStatusWarning()}
      
      <h4 className="font-bold text-lg mb-2 border-b pb-2 dark:text-gray-200 dark:border-gray-600">Общая информация</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {renderField('Наименование инцидента', 'incident_name')}
        {renderField('Причина', 'root_cause')}
        <div className="md:col-span-2">{renderField('Описание инцидента', 'description', 'textarea')}</div>
        <div className="md:col-span-2">{renderField('Принятые меры', 'taken_measures', 'textarea')}</div>
      </div>

      <h4 className="font-bold text-lg mb-2 border-b pb-2 dark:text-gray-200 dark:border-gray-600">Классификация</h4>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {renderField('Тип контроля', 'control_type')}
        {renderField('Подтип контроля', 'control_subtype')}
        {renderField('Риск', 'risk', 'select', ['Риск 1', 'Риск 2'])}
        {renderField('Категория', 'category')}
        {renderField('Problem area', 'problem_area', 'select', ['система'])}
        {renderField('Канал выявления', 'detected_source', 'select', ['FMS', 'Отчет', 'Письмо'])}
        {renderField('Тип случая', 'case_type', 'select', ['regular', 'singular'])}
        {renderField('Service abused', 'service_abused', 'select', ['GPRS', 'Voice', 'SMS', 'Other'])}
      </div>

      <h4 className="font-bold text-lg mb-2 border-b pb-2 dark:text-gray-200 dark:border-gray-600">Даты</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {renderField('Отчетный месяц', 'reporting_month', 'date')}
          {renderField('Дата происшествия', 'occurrence_date', 'date')}
          {renderField('Дата решения', 'solution_date', 'date')}
          {renderField('Дата закрытия', 'close_date', 'date')}
      </div>

      <h4 className="font-bold text-lg mb-2 border-b pb-2 dark:text-gray-200 dark:border-gray-600">Финансовые показатели</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {renderField('Выявленные потери', 'estimated_loss', 'number')}
        {renderField('Упущенная выгода', 'opportunity_loss', 'number')}
        {renderField('Bad Debt', 'bad_debt', 'number')}
        {renderField('Prevented Savings', 'prevented_savings', 'number')}
        {renderField('Recovered Savings', 'recovered_savings', 'number')}
        {renderField('Overcharge', 'overchange', 'number')}
        {renderField('Count of fraudulent numbers', 'count_fraudulent_numbers', 'number')}
        {renderField('Расчет KPI', 'kpi_calculation', 'number')}
      </div>
      
       <h4 className="font-bold text-lg mb-2 border-b pb-2 dark:text-gray-200 dark:border-gray-600">Прочее</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
         <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Вложение</label>
            {!isEditMode || !incident.attachment ? (
                 <Input type="file" onChange={handleFileChange} disabled={!isEditable} />
            ) : (
                <div className="flex items-center justify-between p-2 border rounded dark:border-gray-600 h-[42px]">
                    <span className="dark:text-gray-300 truncate min-w-0 pr-2" title={incident.attachment.split('_').slice(2).join('_')}>
                        {incident.attachment.split('_').slice(2).join('_')}
                    </span>
                    <Button type="button" onClick={() => handleDownload(incident.attachment)} size="sm">Скачать</Button>
                </div>
            )}
        </div>
         {renderField('Подтвержденный фрод', 'confirmed_fraud', 'select', ['Да', 'Нет'])}
      </div>

      <div className="flex justify-between items-center pt-4 gap-2">
        {/* Кнопки смены статуса */}
        <div>
            {isEditMode && incident.status === 'Открыт' && (
                <Button type="button" onClick={() => handleStatusChangeClick('На согласовании')} className="bg-yellow-500 hover:bg-yellow-600 text-white">
                    Отправить на согласование
                </Button>
            )}
            {isEditMode && userRole === 'ADMIN' && incident.status === 'На согласовании' && (
                <div className="flex gap-2">
                    <Button type="button" onClick={() => handleStatusChangeClick('Согласован')} variant="primary">Согласовать</Button>
                    <Button type="button" onClick={() => handleStatusChangeClick('Отклонён')} variant="danger">Отклонить</Button>
                </div>
            )}
        </div>

        {/* Основные кнопки действия */}
        <div className="flex gap-2">
            <Button type="button" onClick={onClose} variant="secondary">Отмена</Button>
            {isEditable && (
                <Button type="submit" disabled={loading}>
                    {loading ? 'Сохранение...' : (isEditMode ? 'Сохранить изменения' : 'Создать инцидент')}
                </Button>
            )}
        </div>
      </div>
    </form>
  )
}; 