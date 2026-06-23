import React, { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import { ExcelUpload } from "../components/ExcelUpload";
import { useDeployment } from "../context/DeploymentContext";

const B2B_AREAS = ["Продукты", "Продажи"] as const;

interface Control {
  id: number;
  area: string;
  name: string;
  description: string;
  time_estimate: number;
  frequency: string;
  deadline_at?: string | null;
  responsible_id: number;
  backup_id: number;
  risk: string;
  priority: string;
  dashboard_url?: string;
  status?: string;
  responsible_name?: string;
  backup_name?: string;
}

interface User {
  id: number;
  username: string;
  role: string;
}

const frequencies = [
  "ежедневно",
  "еженедельно",
  "ежемесячно",
  "ежеквартально",
  "полугодично",
  "по требованию",
];

function deadlineToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const s = iso.includes("T") ? iso.slice(0, 16) : iso;
  return s.replace(" ", "T").slice(0, 16);
}

function toDeadlineApiValue(raw: string): string | null {
  const v = (raw || "").trim();
  if (!v) return null;
  // datetime-local: "YYYY-MM-DDTHH:mm" — добавляем секунды для стабильного разбора на сервере
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return `${v}:00`;
  return v;
}

function formatDeadlineRu(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const Controls: React.FC = () => {
  const { deployment } = useDeployment();
  const isLiteB2b = deployment === "lite";
  const [controls, setControls] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({
    area: "",
    name: "",
    description: "",
    time_estimate: 0,
    frequency: frequencies[0],
    deadline_at: "",
    responsible_id: 0,
    backup_id: 0,
    risk: "",
    priority: "",
    dashboard_url: "",
    status: "active"
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const areaInputRef = React.useRef<HTMLInputElement>(null);
  const areaSelectRef = React.useRef<HTMLSelectElement>(null);
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterResponsible, setFilterResponsible] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(Infinity);
  const [usersError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    fetch("/api/controls", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => Array.isArray(data) ? setControls(data) : setControls([]))
      .catch(() => setError("Ошибка загрузки контролей"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error(res.status.toString());
        return res.json();
      })
      .then(data => Array.isArray(data) ? setUsers(data) : setUsers([]))
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    if (!showForm) return;
    if (isLiteB2b) {
      areaSelectRef.current?.focus();
    } else {
      areaInputRef.current?.focus();
    }
  }, [showForm, isLiteB2b]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(f => ({
      ...f,
      [name]: ["time_estimate", "responsible_id", "backup_id"].includes(name) ? Number(value) : value
    }));
  };

  const handleExcelUpload = async (file: File) => {
    setImporting(true);
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/controls/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        setAlert('Контроли успешно импортированы');
        setShowImport(false);
        // Обновляем список контролей
        const controlsResponse = await fetch("/api/controls", { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        const controlsData = await controlsResponse.json();
        setControls(Array.isArray(controlsData) ? controlsData : []);
      } else {
        const errorData = await response.json();
        setAlert(`Ошибка импорта: ${errorData.msg}`);
      }
    } catch (err) {
      setAlert('Ошибка при загрузке файла');
    } finally {
      setImporting(false);
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const openEditForm = (control: Control) => {
    setForm({
      area: control.area,
      name: control.name,
      description: control.description,
      time_estimate: control.time_estimate,
      frequency: control.frequency,
      deadline_at: deadlineToDatetimeLocal(control.deadline_at),
      responsible_id: control.responsible_id,
      backup_id: control.backup_id,
      risk: control.risk,
      priority: control.priority,
      dashboard_url: control.dashboard_url || "",
      status: control.status || "active"
    });
    setEditId(control.id);
    setShowForm(true);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowForm(false);
      setEditId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить контроль?')) return;
    const token = localStorage.getItem("token");
    await fetch(`/api/controls/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setControls(controls => controls.filter(c => c.id !== id));
    setAlert('Контроль удалён');
    setTimeout(() => setAlert(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    const token = localStorage.getItem("token");
    try {
      let res;
      let body: Record<string, unknown>;
      if (isLiteB2b) {
        body = {
          area: form.area,
          name: form.name,
          description: form.description,
          responsible_id: form.responsible_id,
          backup_id: form.backup_id > 0 ? form.backup_id : null,
          risk: form.risk,
          priority: form.priority,
          dashboard_url: form.dashboard_url,
          status: form.status,
          deadline_at: toDeadlineApiValue(form.deadline_at),
        };
      } else {
        body = { ...form };
      }
      if (editId) {
        res = await fetch(`/api/controls/${editId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/controls", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.msg || "Ошибка сохранения контроля");
        setSaving(false);
        return;
      }
      setShowForm(false);
      setEditId(null);
      setForm({
        area: "",
        name: "",
        description: "",
        time_estimate: 0,
        frequency: frequencies[0],
        deadline_at: "",
        responsible_id: 0,
        backup_id: 0,
        risk: "",
        priority: "",
        dashboard_url: "",
        status: "active"
      });
      setAlert(editId ? 'Контроль обновлён' : 'Контроль создан');
      setTimeout(() => setAlert(null), 2000);
      // обновить список контролей
      fetch("/api/controls", { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => Array.isArray(data) ? setControls(data) : setControls([]));
    } catch {
      setFormError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  const openAddForm = () => {
    setForm({
      area: "",
      name: "",
      description: "",
      time_estimate: 0,
      frequency: frequencies[0],
      deadline_at: "",
      responsible_id: 0,
      backup_id: 0,
      risk: "",
      priority: "",
      dashboard_url: "",
      status: "active"
    });
    setEditId(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
  };

  // Фильтрация и поиск
  const filteredControls = controls.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.area.toLowerCase().includes(search.toLowerCase());
    const matchesArea = filterArea ? c.area === filterArea : true;
    const matchesResp = filterResponsible ? String(c.responsible_id) === filterResponsible : true;
    return matchesSearch && matchesArea && matchesResp;
  });

  // Пагинация
  const totalPages = Math.ceil(filteredControls.length / perPage) || 1;
  const paginatedControls = filteredControls.slice((page - 1) * perPage, page * perPage);

  if (users.length === 0 && !loading && showForm) {
    return (
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Ошибка">
        <div className="text-center">
            <p className="dark:text-gray-300">Не удалось загрузить список пользователей. Форма не может быть отображена.</p>
            <Button onClick={() => setShowForm(false)} className="mt-4">Закрыть</Button>
        </div>
      </Modal>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {alert && (
        <div className="fixed top-20 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg animate-fade-in-out">
            {alert}
        </div>
      )}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold dark:text-gray-200">Список контролей</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            type="text"
            placeholder="Поиск..."
            className="border rounded px-3 py-1.5 text-sm w-40 focus:ring-2 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <select
             className="border rounded px-3 py-1.5 text-sm w-40 focus:ring-2 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
             value={filterArea}
             onChange={e => { setFilterArea(e.target.value); setPage(1); }}
          >
            <option value="">Все области</option>
            {(isLiteB2b ? [...B2B_AREAS] : Array.from(new Set(controls.map(c => c.area)))).map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
          <select
             className="border rounded px-3 py-1.5 text-sm w-40 focus:ring-2 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
             value={filterResponsible}
             onChange={e => { setFilterResponsible(e.target.value); setPage(1); }}
          >
            <option value="">Все ответственные</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
          </select>
          {!isLiteB2b && (
          <Button onClick={() => setShowImport(true)} variant="secondary">Импорт Excel</Button>
          )}
          <Button onClick={openAddForm}>Добавить</Button>
        </div>
      </div>
      
      <Modal isOpen={showForm} onClose={closeForm} title={editId ? 'Редактировать контроль' : 'Добавить контроль'}>
        <form onSubmit={handleSubmit} ref={formRef} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Область</label>
            {isLiteB2b ? (
              <select
                name="area"
                ref={areaSelectRef}
                value={form.area}
                onChange={handleFormChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="" disabled>Выберите область</option>
                {B2B_AREAS.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            ) : (
              <Input name="area" value={form.area} onChange={handleFormChange} required ref={areaInputRef} />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Наименование</label>
            <Input name="name" value={form.name} onChange={handleFormChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Описание</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleFormChange}
              rows={3}
              className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          {!isLiteB2b && (
          <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Временные затраты (мин)</label>
            <Input name="time_estimate" type="number" value={form.time_estimate} onChange={handleFormChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Регулярность</label>
            <Select name="frequency" value={form.frequency} onChange={handleFormChange} required>
              {frequencies.map(f => <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>
          </>
          )}
          {isLiteB2b && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Срок (дедлайн)</label>
            <input
              type="datetime-local"
              name="deadline_at"
              value={form.deadline_at}
              onChange={handleFormChange}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ответственный</label>
            <Select name="responsible_id" value={form.responsible_id} onChange={handleFormChange} required>
              <option value={0} disabled>Выберите пользователя</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Замещающий</label>
            <Select name="backup_id" value={form.backup_id} onChange={handleFormChange} required>
              <option value={0} disabled>Выберите пользователя</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ссылка на дашборд</label>
            <Input name="dashboard_url" value={form.dashboard_url || ''} onChange={handleFormChange} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Статус</label>
            <select
              name="status"
              value={form.status || 'active'}
              onChange={handleFormChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="active">Активный</option>
              <option value="suspended">Приостановлен</option>
            </select>
          </div>
          {formError && <p className="text-red-500 text-sm">{formError}</p>}
          <div className="flex justify-end pt-4">
            <Button type="button" onClick={closeForm} variant="secondary" className="mr-2">Отмена</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showImport} onClose={() => setShowImport(false)} title="Импорт контролей из Excel">
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
             <p className="font-bold">Требования к файлу:</p>
             <p  className="mt-2">Ваш .xlsx файл должен содержать столбцы с данными для импорта. Названия столбцов могут быть на русском или английском языке, регистр не важен.</p>
             
             <p className="font-bold mt-4">Обязательные столбцы:</p>
             <ul className="list-disc list-inside mt-1">
               <li><b>Название контроля:</b> `name` или `control_name`</li>
               <li><b>Ответственный:</b> `responsible`, `control_responsible` или `ответственный` (укажите имя пользователя)</li>
             </ul>

             <p className="font-bold mt-4">Опциональные столбцы:</p>
             <ul className="list-disc list-inside mt-1">
               <li><b>Описание:</b> `description` или `описание`</li>
               <li><b>Область:</b> `area` или `область`</li>
               <li><b>Частота:</b> `frequency` или `частота`</li>
               <li><b>Оценка времени (в минутах):</b> `time_estimate`</li>
               <li><b>Замещающий:</b> `substitute`, `control_substitute` (укажите имя пользователя)</li>
               <li><b>Риск:</b> `risk` или `риск`</li>
               <li><b>Приоритет:</b> `priority` или `приоритет`</li>
             </ul>
              <p className="mt-4">Система автоматически найдет пользователей по их именам. Если пользователь не будет найден, вы получите ошибку.</p>
          </div>
          
          <ExcelUpload 
            onUpload={handleExcelUpload}
            loading={importing}
          />
        </div>
      </Modal>

      <div className="overflow-x-auto shadow-md sm:rounded-lg border dark:border-gray-700">
        <table className="w-full bg-white dark:bg-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Область
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Название
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {isLiteB2b ? "Срок" : "Частота"}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Ответственный
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
            {paginatedControls.map((control) => (
              <tr key={control.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {control.area}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {control.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {isLiteB2b ? formatDeadlineRu(control.deadline_at) : control.frequency}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {control.responsible_name || 'Не назначен'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    control.status === 'active' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {control.status === 'active' ? 'Активный' : 'Приостановлен'}
                  </span>
                </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openEditForm(control)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                    >
                      Редактировать
                    </button>
                  <button
                    onClick={() => handleDelete(control.id)}
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
    </div>
  );
}; 