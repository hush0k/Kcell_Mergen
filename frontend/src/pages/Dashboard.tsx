import React, { useEffect, useState, useMemo } from "react";
import { Button } from "../components/Button";
import { Modal } from '../components/Modal';
import { IncidentForm } from '../components/IncidentForm';
import { useDeployment } from "../context/DeploymentContext";

// Updated interfaces to match new API response
interface User {
  id: number;
  username: string;
}

interface Control {
  id: number;
  name: string;
  area: string; // добавлено поле область
  frequency?: string; // добавлено для корректной типизации
  deadline_at?: string | null;
  responsible: User | null;
  dashboard_url?: string; // добавлено поле для ссылки на дашборд
  priority?: string; // добавлено поле приоритет
  risk?: string; // добавлено поле риск
}

interface Task {
  id: number;
  date: string;
  /** ISO: когда запись задачи появилась в БД (важно для разовых с дедлайном) */
  created_at?: string | null;
  status: string;
  start_time: string | null;
  end_time: string | null;
  comments: string | null;
  weekend_group_id: number | null;
  weekend_related_tasks: Array<{
    id: number;
    date: string;
    status: string;
  }>;
  control: Control;
  assignee: User | null;
}

/**
 * Backend (/api/v1/tasks/, /api/v1/controls/) возвращает плоские объекты
 * (control_id, user_id вместо вложенных control/assignee, deadline_time вместо date).
 * Джойним на клиенте, чтобы не трогать остальную бизнес-логику страницы,
 * которая написана в терминах task.date / task.control.* / task.assignee.
 */
function buildTasks(rawTasks: any[], rawControls: any[], rawUsers: any[]): Task[] {
  const userById = new Map<number, User>(rawUsers.map((u: any) => [u.id, { id: u.id, username: u.username }]));
  const controlById = new Map<number, Control>(
    rawControls.map((c: any) => [
      c.id,
      {
        id: c.id,
        name: c.name,
        area: c.area,
        frequency: c.frequency,
        deadline_at: null, // поле есть только в "lite" B2B-режиме, у основного Control в новом бэке отсутствует
        responsible: c.responsible_id != null ? userById.get(c.responsible_id) ?? null : null,
        dashboard_url: c.dashboard_url,
        priority: c.priority,
        risk: c.risk,
      },
    ])
  );

  const enriched: Task[] = rawTasks.map((t: any) => ({
    id: t.id,
    date: t.deadline_time,
    created_at: t.created_at,
    status: t.status,
    start_time: t.start_time,
    end_time: t.end_time,
    comments: t.comments,
    weekend_group_id: t.weekend_group_id,
    weekend_related_tasks: [],
    control: controlById.get(t.control_id) ?? {
      id: t.control_id,
      name: "—",
      area: "",
      responsible: null,
    },
    assignee: t.user_id != null ? userById.get(t.user_id) ?? null : null,
  }));

  // Группируем по weekend_group_id: все задачи "выходного" блока (сб/вс) делят
  // одно значение weekend_group_id, равное id "якорной" задачи на понедельник.
  const byWeekendGroup = new Map<number, Task[]>();
  for (const t of enriched) {
    if (t.weekend_group_id != null) {
      const arr = byWeekendGroup.get(t.weekend_group_id) ?? [];
      arr.push(t);
      byWeekendGroup.set(t.weekend_group_id, arr);
    }
  }
  for (const t of enriched) {
    if (t.weekend_group_id != null) {
      t.weekend_related_tasks = (byWeekendGroup.get(t.weekend_group_id) ?? [])
        .filter((rt) => rt.id !== t.id)
        .map((rt) => ({ id: rt.id, date: rt.date, status: rt.status }));
    }
  }

  return enriched;
}

// Интерфейс для фильтров
interface TaskFilters {
  area: string;
  responsible: string;
  assignee: string;
  searchText: string;
  dateFrom: string;
  dateTo: string;
}

/** YYYY-MM-DD из поля задачи (API может отдать и с суффиксом времени) */
function taskDay(d: string): string {
  return String(d).slice(0, 10);
}

/** Нормализация частоты из БД/формы: NBSP, пробелы, регистр */
function normFreq(s: string | null | undefined): string {
  if (s == null || typeof s !== 'string') return '';
  return s.replace(/\u00a0/g, ' ').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isOnDemandNorm(nf: string): boolean {
  return nf === 'по требованию' || nf === 'по запросу';
}

/** Дата задачи совпадает с «сегодня» по браузеру или соседний календарный день (сервер UTC vs локаль) */
function taskDateMatchesTodayWindow(taskDate: string, browserTodayYmd: string): boolean {
  const td = taskDay(taskDate);
  if (td === browserTodayYmd) return true;
  const parts = browserTodayYmd.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false;
  const [y, m, d] = parts;
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const ystr = fmt(new Date(y, m - 1, d - 1));
  const tstr = fmt(new Date(y, m - 1, d + 1));
  return td === ystr || td === tstr;
}

export const Dashboard: React.FC = () => {
  const { deployment } = useDeployment();
  const isLite = deployment === "lite";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentEdit, setCommentEdit] = useState<{ [taskId: number]: string }>({});
  const [savingComment, setSavingComment] = useState<{ [taskId: number]: boolean }>({});
  const [tab, setTab] = useState<'active' | 'overdue' | 'completed' | 'all' | 'on_demand'>('active');
  const [isIncidentModalOpen, setIncidentModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  useEffect(() => {
    if (isLite && tab === "on_demand") {
      setTab("active");
    }
  }, [isLite, tab]);

  // Состояние фильтров
  const [filters, setFilters] = useState<TaskFilters>({
    area: '',
    responsible: '',
    assignee: '',
    searchText: '',
    dateFrom: '',
    dateTo: ''
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'NOT_STARTED':
        return 'Не начата';
      case 'IN_PROGRESS':
        return 'В процессе';
      case 'COMPLETED':
        return 'Выполнена';
      default:
        return status;
    }
  };

  const fetchTasks = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
        setLoading(false);
        setError("Пользователь не авторизован");
        return;
    }
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [tasksRes, controlsRes, usersRes] = await Promise.all([
        fetch("/api/v1/tasks/?limit=1000", { headers }),
        fetch("/api/v1/controls/?per_page=1000", { headers }),
        fetch("/api/v1/user/?limit=1000", { headers }),
      ]);
      if (!tasksRes.ok || !controlsRes.ok || !usersRes.ok) {
        throw new Error('Ошибка сети или сервера');
      }
      const [tasksData, rawControls, rawUsers] = await Promise.all([
        tasksRes.json(),
        controlsRes.json(),
        usersRes.json(),
      ]);
      const rawTasks = Array.isArray(tasksData) ? tasksData : (tasksData.task_list ?? []);
      setTasks(buildTasks(rawTasks, rawControls, rawUsers));
    } catch {
      setError("Ошибка загрузки задач");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const getTimeSpent = (task: Task) => {
    if (task.start_time && task.end_time) {
      const start = new Date(task.start_time).getTime();
      const end = new Date(task.end_time).getTime();
      return Math.round((end - start) / 60000) + " мин.";
    }
    return "-";
  };

  const formatTaskCreated = (task: Task) => {
    const raw = (task.created_at ?? "").trim();
    if (!raw) return "—";
    const d = new Date(raw.includes("T") || raw.includes(" ") ? raw.replace(" ", "T") : `${raw}T12:00:00`);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTaskDeadline = (task: Task) => {
    if (isLite && task.control.deadline_at) {
      const d = new Date(task.control.deadline_at);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }
    return task.date;
  };

  const handleStatus = async (task: Task, status: string) => {
    const token = localStorage.getItem("token");
    if (status === 'IN_PROGRESS') {
      await fetch(`/api/v1/tasks/${task.id}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } else if (status === 'COMPLETED') {
      await fetch(`/api/v1/tasks/${task.id}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    // обновить задачи
    fetchTasks();
  };

  const handleCommentSave = async (task: Task) => {
    setSavingComment(c => ({ ...c, [task.id]: true }));
    const token = localStorage.getItem("token");
    await fetch(`/api/v1/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ comments: commentEdit[task.id] })
    });
    setSavingComment(c => ({ ...c, [task.id]: false }));
    fetchTasks();
  };

  // 1. Локальная дата браузера
  const today = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // 2. Разделение задач на категории
  const inProgress = useMemo(() => tasks.filter(t => t.status === 'IN_PROGRESS'), [tasks]);
  
  // Задачи к выполнению: только ежедневные на сегодня (+ lite «разово»). Еженедельные/месячные и т.д.
  // с датой «сегодня» (напр. понедельник) не попадают сюда — иначе выглядят как «сломали» и дублируют смысл вкладок.
  const toExecute = useMemo(() => {
    return tasks.filter(t => {
      if (t.status !== "not_started") return false;
      const nf = normFreq(t.control?.frequency);
      if (isOnDemandNorm(nf)) return false;
      if (isLite && nf === "разово") {
        if (t.control.deadline_at) {
          return new Date() <= new Date(t.control.deadline_at);
        }
        return taskDay(t.date) >= today;
      }
      if (nf === "ежедневно" || nf === "daily") {
        return taskDay(t.date) === today;
      }
      return false;
    });
  }, [tasks, today, isLite]);

  // Новая логика просроченности с учетом выходных задач
  function isOverdue(task: Task) {
    const nf = normFreq(task.control?.frequency);
    const taskDate = new Date(task.date);
    const now = new Date(today);
    
    // Если задача связана с выходными задачами, проверяем есть ли задача на понедельник
    if (task.weekend_group_id) {
      // Проверяем, есть ли связанная задача на понедельник (сегодня)
      const hasMondayTask = task.weekend_related_tasks.some(relatedTask => 
        taskDay(relatedTask.date) === today
      );
      // Если есть задача на понедельник, то выходные задачи не считаются просроченными
      if (hasMondayTask) {
        return false;
      }
    }
    
    // Разовые (lite / B2B): просрочка по дате-времени дедлайна
    if (nf === "разово" && task.control.deadline_at) {
      return task.status === "NOT_STARTED" && Date.now() > new Date(task.control.deadline_at).getTime();
    }
    if (nf === "разово") {
      return task.status === "NOT_STARTED" && taskDay(task.date) < today;
    }

    if (nf === 'ежедневно' || nf === 'daily') {
      return task.status === 'NOT_STARTED' && taskDay(task.date) < today;
    }
    if (nf === 'еженедельно' || nf === 'weekly') {
      const endOfWeek = new Date(taskDate);
      endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));
      return task.status === 'NOT_STARTED' && now > endOfWeek;
    }
    if (nf === 'ежемесячно' || nf === 'monthly') {
      const endOfMonth = new Date(taskDate.getFullYear(), taskDate.getMonth() + 1, 0);
      return task.status === 'NOT_STARTED' && now > endOfMonth;
    }
    if (nf === 'ежеквартально' || nf === 'quarterly') {
      const quarter = Math.floor(taskDate.getMonth() / 3);
      const endOfQuarter = new Date(taskDate.getFullYear(), quarter * 3 + 3, 0);
      return task.status === 'NOT_STARTED' && now > endOfQuarter;
    }
    // Задачи по требованию/запросу никогда не считаются просроченными
    if (isOnDemandNorm(nf)) {
      return false;
    }
    return task.status === 'NOT_STARTED' && taskDay(task.date) < today;
  }

  // Функция для применения фильтров
  const applyFilters = (taskList: Task[]) => {
    return taskList.filter(task => {
      // Фильтр по области
      if (filters.area && task.control.area !== filters.area) return false;
      
      // Фильтр по ответственному
      if (filters.responsible && task.control.responsible?.username !== filters.responsible) return false;
      
      // Фильтр по исполнителю
      if (filters.assignee && task.assignee?.username !== filters.assignee) return false;
      
      // Поиск по тексту (название контроля, комментарии, область)
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const nameMatch = task.control.name.toLowerCase().includes(searchLower);
        const commentMatch = task.comments?.toLowerCase().includes(searchLower) || false;
        const areaMatch = task.control.area.toLowerCase().includes(searchLower);
        if (!nameMatch && !commentMatch && !areaMatch) return false;
      }
      
      // Фильтр по дате от
      if (filters.dateFrom && task.date < filters.dateFrom) return false;
      
      // Фильтр по дате до
      if (filters.dateTo && task.date > filters.dateTo) return false;
      

      
      return true;
    });
  };

  // Получение уникальных значений для dropdown'ов
  const uniqueAreas = useMemo(() => Array.from(new Set(tasks.map(t => t.control.area))).sort(), [tasks]);
  const uniqueResponsibles = useMemo(() => Array.from(new Set(tasks.map(t => t.control.responsible?.username).filter(Boolean))).sort(), [tasks]);
  const uniqueAssignees = useMemo(() => Array.from(new Set(tasks.map(t => t.assignee?.username).filter(Boolean))).sort(), [tasks]);


  const overdue = useMemo(() => tasks.filter(isOverdue), [tasks, today]);
  const completed = useMemo(() => tasks.filter(t => t.status === 'COMPLETED'), [tasks]);
  
  // Задачи по требованию/запросу (только сегодняшние, не начатые)
  const onDemandTasks = useMemo(() => {
    return tasks.filter(task => {
      const nf = normFreq(task.control?.frequency);
      return isOnDemandNorm(nf)
             && task.status === 'NOT_STARTED'
             && taskDateMatchesTodayWindow(task.date, today);
    });
  }, [tasks, today]);

  const filteredTasks = useMemo(() => {
    let baseTasks: Task[];
    
    // Базовая фильтрация по вкладкам
    switch (tab) {
      case 'active':
        baseTasks = [...inProgress, ...toExecute];
        break;
      case 'overdue':
        baseTasks = overdue;
        break;
      case 'completed':
        baseTasks = completed;
        break;
      case 'on_demand':
        baseTasks = onDemandTasks;
        break;
      case 'all':
      default:
        baseTasks = [...tasks].sort((a, b) => {
          if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1;
          if (a.status !== 'IN_PROGRESS' && b.status === 'IN_PROGRESS') return 1;
          if (a.status === 'NOT_STARTED' && b.status !== 'NOT_STARTED') return -1;
          if (a.status !== 'NOT_STARTED' && b.status === 'NOT_STARTED') return 1;
          return b.date.localeCompare(a.date);
        });
    }
    
    // Применяем дополнительные фильтры
    const filtered = applyFilters(baseTasks);
    
    return filtered;
  }, [tasks, tab, inProgress, toExecute, overdue, completed, onDemandTasks, filters]);

  // Функция для сброса фильтров
  const resetFilters = () => {
    setFilters({
      area: '',
      responsible: '',
      assignee: '',
      searchText: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  // Функция для обновления фильтра
  const updateFilter = (key: keyof TaskFilters, value: string | boolean | null) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleOpenIncidentModal = (task: Task) => {
    setSelectedTask(task);
    setIncidentModalOpen(true);
  };

  const handleCloseIncidentModal = () => {
    setIncidentModalOpen(false);
    setSelectedTask(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-2xl font-bold mb-6">Мои задачи</h2>
      {/* Табы */}
      <div className="flex space-x-2 mb-4">
        <button
          className={`px-4 py-2 rounded-t font-medium transition ${tab === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
          onClick={() => setTab('active')}
        >К выполнению <span className={`ml-1 text-xs rounded px-2 ${tab === 'active' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500 dark:text-white' : 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200'}`}>{inProgress.length + toExecute.length}</span></button>
        <button
          className={`px-4 py-2 rounded-t font-medium transition ${tab === 'overdue' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
          onClick={() => setTab('overdue')}
        >Просроченные <span className={`ml-1 text-xs rounded px-2 ${tab === 'overdue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500 dark:text-white' : 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200'}`}>{overdue.length}</span></button>
        <button
          className={`px-4 py-2 rounded-t font-medium transition ${tab === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
          onClick={() => setTab('completed')}
        >Выполненные <span className={`ml-1 text-xs rounded px-2 ${tab === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500 dark:text-white' : 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200'}`}>{completed.length}</span></button>
        {!isLite && (
        <button
          className={`px-4 py-2 rounded-t font-medium transition ${tab === 'on_demand' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
          onClick={() => setTab('on_demand')}
        >Контроли по требованию <span className={`ml-1 text-xs rounded px-2 ${tab === 'on_demand' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500 dark:text-white' : 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200'}`}>{onDemandTasks.length}</span></button>
        )}
        <button
          className={`px-4 py-2 rounded-t font-medium transition ${tab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
          onClick={() => setTab('all')}
        >Все <span className={`ml-1 text-xs rounded px-2 ${tab === 'all' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500 dark:text-white' : 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200'}`}>{tasks.length}</span></button>
      </div>
      
      {/* Фильтры */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <span>🔍 Фильтры</span>
            <span className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}>▼</span>
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Найдено: {filteredTasks.length} из {tasks.length}
            </span>
            {(filters.area || filters.responsible || filters.assignee || filters.searchText || filters.dateFrom || filters.dateTo) && (
              <button
                onClick={resetFilters}
                className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 rounded transition-colors"
              >
                Сбросить
              </button>
            )}
          </div>
        </div>
        
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Поиск по тексту */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Поиск
                </label>
                <input
                  type="text"
                  placeholder="Название или комментарий..."
                  value={filters.searchText}
                  onChange={(e) => updateFilter('searchText', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              {/* Область */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Область
                </label>
                <select
                  value={filters.area}
                  onChange={(e) => updateFilter('area', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Все области</option>
                  {uniqueAreas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
              
              {/* Ответственный */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ответственный
                </label>
                <select
                  value={filters.responsible}
                  onChange={(e) => updateFilter('responsible', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Все</option>
                  {uniqueResponsibles.map(username => (
                    <option key={username} value={username}>{username}</option>
                  ))}
                </select>
              </div>
              
              {/* Исполнитель */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Исполнитель
                </label>
                <select
                  value={filters.assignee}
                  onChange={(e) => updateFilter('assignee', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Все</option>
                  {uniqueAssignees.map(username => (
                    <option key={username} value={username}>{username}</option>
                  ))}
                </select>
              </div>
              
              {/* Дата от */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Дата от
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              {/* Дата до */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Дата до
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              

            </div>
          </div>
        )}
      </div>
      
      {/* Таблица */}
      {loading ? (
        <div>Загрузка...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10 dark:bg-gray-700">
              <tr>
                <th className="px-2 py-2 border font-semibold dark:border-gray-600">{isLite ? "Срок" : "Дата"}</th>
                {isLite && (
                  <th className="px-2 py-2 border font-semibold dark:border-gray-600">Создана</th>
                )}
                <th className="px-2 py-2 border font-semibold dark:border-gray-600">Контроль</th>
                <th className="px-2 py-2 border font-semibold dark:border-gray-600">Ответственный</th>
                <th className="px-2 py-2 border font-semibold dark:border-gray-600">Исполнитель</th>
                <th className="px-2 py-2 border font-semibold dark:border-gray-600">Статус</th>
                <th className="px-2 py-2 border font-semibold dark:border-gray-600">Комментарий</th>
                <th className="px-2 py-2 border font-semibold dark:border-gray-600">Время выполнения</th>
                {!isLite && (
                  <th className="px-2 py-2 border font-semibold dark:border-gray-600">Инцидент</th>
                )}
                <th className="px-2 py-2 border font-semibold dark:border-gray-600">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-400 dark:text-gray-500">Нет задач</td>
                </tr>
              ) : filteredTasks.map(task => {
                const rowOverdue = isOverdue(task);
                const isInProgress = task.status === 'IN_PROGRESS';
                return (
                  <tr key={task.id}>
                    <td className={`px-2 py-2 border dark:border-gray-600 ${rowOverdue ? 'text-red-600 font-semibold' : ''}`}>{formatTaskDeadline(task)}</td>
                    {isLite && (
                      <td className="px-2 py-2 border text-gray-600 dark:border-gray-600 dark:text-gray-300 whitespace-nowrap">{formatTaskCreated(task)}</td>
                    )}
                    <td className="px-2 py-2 border dark:border-gray-600">
                      {task.control.dashboard_url ? (
                        <a
                          href={task.control.dashboard_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 hover:underline dark:text-blue-400"
                        >
                          {task.control.name}
                        </a>
                      ) : (
                        task.control.name
                      )}
                    </td>
                    <td className="px-2 py-2 border dark:border-gray-600">{task.control.responsible?.username || '-'}</td>
                    <td className="px-2 py-2 border dark:border-gray-600">{task.assignee?.username || '-'}</td>
                    <td className={`px-2 py-2 border dark:border-gray-600 capitalize ${isInProgress ? 'font-bold text-blue-700 dark:text-blue-400' : ''} ${rowOverdue ? 'text-red-600' : ''}`}>{getStatusLabel(task.status)}</td>
                    <td className="px-2 py-2 border dark:border-gray-600">
                      <input
                        className="border rounded px-2 py-1 w-32 text-xs dark:bg-gray-700 dark:border-gray-600"
                        value={commentEdit[task.id] ?? task.comments ?? ''}
                        onChange={e => setCommentEdit(c => ({ ...c, [task.id]: e.target.value }))}
                        onBlur={() => handleCommentSave(task)}
                        disabled={savingComment[task.id]}
                      />
                    </td>
                    <td className="px-2 py-2 border dark:border-gray-600">{getTimeSpent(task)}</td>
                    {!isLite && (
                    <td className="px-2 py-2 border text-center dark:border-gray-600">
                        <Button
                        className="bg-yellow-400 hover:bg-yellow-500 text-black w-8 h-8 p-0 flex items-center justify-center rounded-full"
                        title="Создать инцидент"
                        onClick={() => handleOpenIncidentModal(task)}
                        disabled={false}
                        >
                          ⚠️
                        </Button>
                    </td>
                    )}
                    {/* Действия */}
                    <td className="px-2 py-2 border space-x-2 text-center dark:border-gray-600">
                      {task.status === 'NOT_STARTED' && (
                        <Button
                          className="bg-green-500 hover:bg-green-600 w-8 h-8 p-0 flex items-center justify-center rounded-full"
                          onClick={() => handleStatus(task, 'IN_PROGRESS')}
                          title="Начать"
                        >
                          ▶️
                        </Button>
                      )}
                      {task.status === 'IN_PROGRESS' && (
                        <Button
                          className="bg-red-500 hover:bg-red-600 w-8 h-8 p-0 flex items-center justify-center rounded-full"
                          onClick={() => handleStatus(task, 'COMPLETED')}
                          title="Завершить"
                        >
                          ⏹️
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!isLite && selectedTask && (
        <Modal
          isOpen={isIncidentModalOpen}
          onClose={handleCloseIncidentModal}
          title={`Создать инцидент для: ${tasks.find(t => t.id === selectedTask.id)?.control.name}`}
        >
          <IncidentForm 
            taskId={selectedTask.id} 
            incidentData={{ ...selectedTask, controlArea: selectedTask.control.area }} // <-- передаю область контроля и всю задачу
            onClose={handleCloseIncidentModal} 
            isEditMode={false} 
          />
        </Modal>
      )}
      {/* Safelist for Tailwind JIT: */}
      <div className="hidden bg-blue-600 bg-red-600 bg-green-600 bg-gray-800 text-white"></div>
    </div>
  );
}; 