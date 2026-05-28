import { useEffect, useState } from 'react';
import { formatWeekRange, getWeekDates } from '../utils/date';
import { fetchWeeklyReport } from '../hooks/useStats';
import type { WeeklyReport } from '../types';

export default function WeeklyReportPage() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReport();
  }, [weekOffset]);

  async function loadReport() {
    try {
      setLoading(true);
      setError('');
      const targetDate = getWeekDates(weekOffset).monday;
      const data = await fetchWeeklyReport(targetDate);
      setReport(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center py-16">
          <span className="text-gray-400">生成周报中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-center py-16">
          <span className="text-4xl">😢</span>
          <p className="text-red-500 mt-4">{error}</p>
          <button onClick={loadReport} className="mt-4 text-blue-500">重试</button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div className="p-4 pb-24">
      {/* 头部：周切换 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-600"
        >
          ‹
        </button>
        <h1 className="text-lg font-bold text-gray-800">
          {formatWeekRange(report.weekStart, report.weekEnd)}
        </h1>
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          disabled={weekOffset >= 0}
          className={`w-10 h-10 rounded-full shadow-sm border border-gray-100 flex items-center justify-center ${
            weekOffset >= 0 ? 'text-gray-300 bg-gray-50' : 'text-gray-600 bg-white'
          }`}
        >
          ›
        </button>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">本周完成率</div>
          <p className="text-2xl font-bold text-blue-600">{report.weekRate}%</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">打卡天数</div>
          <p className="text-2xl font-bold text-green-600">{report.checkinDays}/7</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">本周获得积分</div>
          <p className="text-2xl font-bold text-amber-500">+{report.totalPointsEarned}🏆</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">本周消耗积分</div>
          <p className="text-2xl font-bold text-orange-500">-{report.totalPointsSpent}🎁</p>
        </div>
      </div>

      {/* 积分汇总 */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 mb-6 border border-amber-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-600 mb-1">本周净积分</div>
            <p className="text-2xl font-bold text-amber-600">
              {report.netPoints >= 0 ? '+' : ''}{report.netPoints} 🏆
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">当前总余额</div>
            <p className="text-2xl font-bold text-gray-800">{report.balance} 🏆</p>
          </div>
        </div>
      </div>

      {/* 每日明细 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <h2 className="text-sm font-medium text-gray-600 mb-4">每日完成情况</h2>
        <div className="grid grid-cols-7 gap-1">
          {report.dailyBreakdown.map((day, i) => {
            const hasCheckin = day.count > 0;
            return (
              <div key={day.date} className="flex flex-col items-center">
                <span className="text-xs text-gray-400 mb-1">{weekdays[i]}</span>
                <div
                  className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs ${
                    hasCheckin
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-50 text-gray-300'
                  }`}
                >
                  <span className="font-medium">{new Date(day.date).getDate()}</span>
                  {hasCheckin && <span className="text-[10px]">{day.rate}%</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* 每日任务列表 */}
        <div className="mt-4 flex flex-col gap-3">
          {report.dailyBreakdown.filter(d => d.count > 0).map(day => (
            <div key={day.date} className="border-t border-gray-50 pt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500">
                  {new Date(day.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })}
                </span>
                <span className="text-xs text-gray-400">完成 {day.count} 项 · {day.rate}%</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {day.tasks.map((t, j) => (
                  <span key={j} className="text-xs bg-gray-50 px-2 py-0.5 rounded-full">
                    {t.emoji} {t.name}
                    {t.quality && <span className="ml-0.5">{'⭐'.repeat(t.quality)}</span>}
                    {t.pointsEarned > 0 && <span className="ml-0.5 text-amber-600">+{t.pointsEarned}🏆</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {report.dailyBreakdown.every(d => d.count === 0) && (
            <p className="text-center text-gray-400 text-sm py-4">本周暂无打卡记录</p>
          )}
        </div>
      </div>

      {/* 科目分布 */}
      {Object.keys(report.subjectDist).length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-sm font-medium text-gray-600 mb-3">科目分布</h2>
          <div className="flex flex-col gap-2">
            {Object.entries(report.subjectDist)
              .sort(([, a], [, b]) => b - a)
              .map(([subject, count]) => {
                const pct = report.totalCheckins > 0 ? Math.round((count / report.totalCheckins) * 100) : 0;
                return (
                  <div key={subject} className="flex items-center gap-3">
                    <span className="text-sm w-12 text-gray-600">{subject}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-16 text-right">{count}次 ({pct}%)</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 质量分布 */}
      {report.avgQuality > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-sm font-medium text-gray-600 mb-3">完成质量分布</h2>
          <div className="flex gap-4">
            {[3, 2, 1].map(q => (
              <div key={q} className="flex-1 text-center">
                <div className="text-2xl">{'⭐'.repeat(q)}</div>
                <div className="text-lg font-bold text-gray-800">{report.qualityDist[q] || 0}</div>
                <div className="text-xs text-gray-400">次</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 本周兑换 */}
      {report.redemptions && report.redemptions.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-sm font-medium text-gray-600 mb-3">本周兑换</h2>
          <div className="flex flex-col gap-2">
            {report.redemptions.map(r => (
              <div key={r.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎁</span>
                  <span className="text-sm text-gray-700">{r.name}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(r.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <span className="text-sm font-medium text-orange-500">-{r.points} 🏆</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 其他统计 */}
      {(report.makeupCount > 0 || report.photoCount > 0) && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="text-sm font-medium text-gray-600 mb-3">其他</h2>
          <div className="flex gap-4">
            {report.makeupCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>🔙</span>
                <span>补打卡 {report.makeupCount} 次</span>
              </div>
            )}
            {report.photoCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>📷</span>
                <span>照片凭证 {report.photoCount} 张</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
