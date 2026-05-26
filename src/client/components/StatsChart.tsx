import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { fetchCompletionRate, fetchSubjectStats } from '../hooks/useStats';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
);

export default function StatsChart() {
  const [completionData, setCompletionData] = useState<{ date: string; rate: number }[]>([]);
  const [subjectData, setSubjectData] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchCompletionRate('week').then(setCompletionData);
    fetchSubjectStats().then(setSubjectData);
  }, []);

  const lineData = {
    labels: completionData.map(d => d.date.slice(5)),
    datasets: [
      {
        label: '完成率 %',
        data: completionData.map(d => d.rate),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const barData = {
    labels: Object.keys(subjectData),
    datasets: [
      {
        label: '打卡次数',
        data: Object.values(subjectData),
        backgroundColor: ['#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#6B7280'],
        borderRadius: 8,
      },
    ],
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 完成率趋势 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-medium text-gray-600 mb-3">近7天完成率</h3>
        <div className="h-48">
          <Line
            data={lineData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { min: 0, max: 100, ticks: { callback: (v) => `${v}%` } },
              },
            }}
          />
        </div>
      </div>

      {/* 科目统计 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-medium text-gray-600 mb-3">各科目打卡次数</h3>
        <div className="h-48">
          {Object.keys(subjectData).length > 0 ? (
            <Bar
              data={barData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              暂无数据
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
