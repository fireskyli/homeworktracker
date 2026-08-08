import { useState, useEffect, useCallback } from 'react';
import { ScheduleStats } from '../types';
import { fetchScheduleStats } from '../hooks/useScheduleAttendance';

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

interface Props {
  year: number;
  month: number; // 0-11
  onMonthChange: (year: number, month: number) => void;
}

export default function AttendanceStats({ year, month, onMonthChange }: Props) {
  const [stats, setStats] = useState<ScheduleStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchScheduleStats(year, month + 1);
      setStats(data);
    } catch (err) {
      console.error('加载统计数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    onMonthChange(y, m);
  }

  // 汇总
  const totalClasses = stats.reduce((s, st) => s + st.total, 0);
  const totalAttended = stats.reduce((s, st) => s + st.attended + st.makeup, 0);
  const overallRate = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;

  if (stats.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <span className="text-base font-bold">📊 出勤统计</span>
        <span className="text-gray-400 text-sm">{expanded ? '▲ 收起' : '▼ 展开'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {/* 月份切换 */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => changeMonth(-1)}
              className="w-8 h-8 rounded-full bg-gray-100 text-gray-600"
            >
              ‹
            </button>
            <span className="text-sm font-semibold">{year}年 {MONTHS[month]}</span>
            <button
              onClick={() => changeMonth(1)}
              className="w-8 h-8 rounded-full bg-gray-100 text-gray-600"
            >
              ›
            </button>
          </div>

          {/* 汇总 */}
          <div className="bg-green-50 rounded-lg p-3 mb-3 flex items-center justify-between">
            <span className="text-sm text-green-800 font-medium">本月出勤率</span>
            <span className="text-lg font-bold text-green-700">
              {overallRate}% ({totalAttended}/{totalClasses})
            </span>
          </div>

          {/* 各课程统计 */}
          {loading ? (
            <div className="text-center text-gray-400 text-sm py-4">加载中...</div>
          ) : (
            <div className="space-y-3">
              {stats.map(s => (
                <div key={s.scheduleId}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">
                      {s.emoji} {s.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {s.attended + s.makeup}/{s.total}次 · {s.rate}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${s.rate}%` }}
                    />
                  </div>
                  <div className="flex gap-3 mt-0.5 text-[10px] text-gray-400">
                    <span>✅ {s.attended}</span>
                    <span>🔄 {s.makeup}</span>
                    <span>❌ {s.absent}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
