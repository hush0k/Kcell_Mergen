import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { useTheme } from '../context/ThemeContext';
import { useDeployment } from '../context/DeploymentContext';
import { ReportExports } from './ReportExports';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

interface SummaryData {
  incidents: {
    total: number;
    by_status: { [key: string]: number };
  };
  tasks: {
    total: number;
    overdue: number;
  };
}

const KPICard: React.FC<{ title: string; value: number | string; }> = ({ title, value }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700">
    <h3 className="text-gray-500 dark:text-gray-400 text-lg">{title}</h3>
    <p className="text-4xl font-bold mt-2 text-gray-900 dark:text-white">{value}</p>
  </div>
);

const ReportsAnalytics: React.FC = () => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { theme } = useTheme();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Не авторизован');
      setLoading(false);
      return;
    }

    fetch('/api/analytics/summary', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject('Ошибка загрузки данных'))
      .then(data => setSummary(data))
      .catch(err => setError(typeof err === 'string' ? err : 'Не удалось загрузить данные'))
      .finally(() => setLoading(false));
  }, []);

  const chartTextColor = theme === 'dark' ? '#f9fafb' : '#374151';

  const incidentChartData = {
    labels: summary ? Object.keys(summary.incidents.by_status) : [],
    datasets: [
      {
        label: 'Инциденты',
        data: summary ? Object.values(summary.incidents.by_status) : [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const incidentChartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: chartTextColor },
      },
    },
  };

  if (loading) return <div className="p-8">Загрузка данных...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!summary) return <div className="p-8">Нет данных для отображения.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-3xl font-bold mb-8 dark:text-gray-200">Аналитический дашборд</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard title="Всего инцидентов" value={summary.incidents.total} />
        <KPICard title="Открытые инциденты" value={summary.incidents.by_status['Открыт'] || 0} />
        <KPICard title="Всего задач" value={summary.tasks.total} />
        <KPICard title="Просроченные задачи" value={summary.tasks.overdue} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700">
          <h3 className="text-xl font-semibold mb-4 text-center dark:text-gray-200">Распределение инцидентов по статусам</h3>
          <div className="h-80 mx-auto" style={{ maxWidth: '400px' }}>
            <Pie data={incidentChartData} options={incidentChartOptions} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700 flex items-center justify-center">
          <p className="text-gray-400 dark:text-gray-500">Здесь будет еще один график</p>
        </div>
      </div>
    </div>
  );
};

export const Reports: React.FC = () => {
  const { deployment } = useDeployment();
  if (deployment === 'lite') {
    return <ReportsAnalytics />;
  }
  return <ReportExports />;
};
