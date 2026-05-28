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
import { fetchExerciseTrend, fetchExerciseByType } from '../hooks/useExerciseStats';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
);

export default function ExerciseStatsChart() {
  const [trendData, setTrendData] = useState<{ date: string; count: number; suns: number }[]>([]);
  const [typeData, setTypeData] = useState<{ name: string; emoji: string; count: number; totalSuns: number }[]>([]);

  useEffect(() => {
    fetchExerciseTrend('week').then(setTrendData);
    fetchExerciseByType().then(setTypeData);
  }, []);

  const lineData = {
    labels: trendData.map(d => d.date.slice(5)),
    datasets: [
      {
        label: '运动次数',
        data: trendData.map(d => d.count),
        borderColor: '#F97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: '太阳数',
        data: trendData.map(d => d.suns),
        borderColor: '#EAB308',
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const barData = {
    labels: typeData.map(t => t.name),
    datasets: [
      {
        label: '运动次数',
        data: typeData.map(t => t.count),
        backgroundColor: ['#F97316', '#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#06B6D4'],
        borderRadius: 8,
      },
    ],
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 运动趋势 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-medium text-gray-600 mb-3">近7天运动趋势</h3>
        <div className="h-48">
          <Line
            data={lineData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'top' as const, labels: { boxWidth: 12, font: { size: 11 } } } },
              scales: {
                y: { min: 0, ticks: { stepSize: 1 } },
              },
            }}
          />
        </div>
      </div>

      {/* 运动类型分布 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-medium text-gray-600 mb-3">各运动类型次数</h3>
        <div className="h-48">
          {typeData.length > 0 ? (
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
