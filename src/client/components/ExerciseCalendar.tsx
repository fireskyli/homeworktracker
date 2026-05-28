import { useState, useEffect } from 'react';
import { fetchExerciseCalendar } from '../hooks/useExerciseStats';

export default function ExerciseCalendar() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [days, setDays] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchExerciseCalendar(year, month)
      .then(data => setDays(data.days))
      .finally(() => setLoading(false));
  }, [year, month]);

  const firstDay = new Date(year, month - 1, 1).getDay();
  const totalDays = new Date(year, month, 0).getDate();

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="text-gray-500 px-2">‹</button>
        <h3 className="font-medium">{year}年{month}月</h3>
        <button onClick={nextMonth} className="text-gray-500 px-2">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-2">
        {['日', '一', '二', '三', '四', '五', '六'].map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {loading ? (
          <div className="col-span-7 py-8 text-gray-400">加载中...</div>
        ) : (
          cells.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} />;
            const dayStr = String(day).padStart(2, '0');
            const count = days[dayStr] || 0;
            return (
              <div
                key={day}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg ${
                  count > 0
                    ? 'bg-orange-500 text-white font-medium'
                    : 'text-gray-400'
                }`}
              >
                {day}
                {count > 0 && <span className="text-[10px]">{count}次</span>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
