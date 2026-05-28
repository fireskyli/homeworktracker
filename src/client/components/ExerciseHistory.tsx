import { useEffect, useState } from 'react';
import { fetchExerciseHistory } from '../hooks/useExerciseStats';
import type { Exercise } from '../types';
import SunStars from './SunStars';

export default function ExerciseHistory() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  useEffect(() => {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    fetchExerciseHistory({ startDate: start, endDate: end })
      .then(data => {
        const parsed = data.exercises.map((e: any) => ({
          ...e,
          sets: e.sets ? JSON.parse(e.sets) : null,
        }));
        setExercises(parsed);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // 按日期分组
  const grouped: Record<string, Exercise[]> = {};
  for (const e of exercises) {
    if (!grouped[e.date]) grouped[e.date] = [];
    grouped[e.date].push(e);
  }
  const dates = Object.keys(grouped).sort().reverse();

  if (loading) {
    return <div className="text-center py-8 text-gray-400">加载中...</div>;
  }

  if (exercises.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <span className="text-4xl">🏃</span>
        <p className="mt-2">近30天暂无运动记录</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {dates.map(date => {
        const items = grouped[date];
        const daySuns = items.reduce((s, e) => s + (e.quality || 0), 0);
        const isExpanded = expandedDate === date;
        return (
          <div key={date} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <button
              onClick={() => setExpandedDate(isExpanded ? null : date)}
              className="w-full flex items-center justify-between p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })}
                </span>
                <span className="text-xs text-gray-400">{items.length} 项运动</span>
              </div>
              <div className="flex items-center gap-2">
                {daySuns > 0 && (
                  <span className="text-xs text-amber-500">{'☀️'.repeat(daySuns > 3 ? 3 : daySuns)}{daySuns > 3 ? `+${daySuns - 3}` : ''}</span>
                )}
                <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-gray-50 px-3 pb-3 pt-1 flex flex-col gap-2">
                {items.map(ex => (
                  <div key={ex.id} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{ex.exerciseType?.emoji || '🏃'}</span>
                      <div>
                        <span className="text-sm text-gray-700">{ex.exerciseType?.name || '运动'}</span>
                        {ex.sets && ex.sets.length > 0 && (
                          <span className="text-xs text-gray-400 ml-2">
                            {ex.sets.map((s, i) => `${s.count}组×${s.reps}${ex.exerciseType?.unit || '次'}`).join(' / ')}
                          </span>
                        )}
                        {ex.note && <span className="text-xs text-gray-400 ml-1">· {ex.note}</span>}
                      </div>
                    </div>
                    {ex.quality && <SunStars value={ex.quality} readonly />}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
