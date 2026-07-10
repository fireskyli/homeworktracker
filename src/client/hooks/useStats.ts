import { StatsOverview, StreakData, CalendarData, WeeklyReport } from '../types';
import { apiFetch } from '../utils/api';

export async function fetchStatsOverview(): Promise<StatsOverview> {
  const res = await apiFetch('/api/stats/overview');
  if (!res.ok) throw new Error('获取统计失败');
  return res.json();
}

export async function fetchStreak(): Promise<StreakData> {
  const res = await apiFetch('/api/stats/streak');
  if (!res.ok) throw new Error('获取连续天数失败');
  return res.json();
}

export async function fetchCompletionRate(
  period: 'week' | 'month',
  startDate?: string
): Promise<{ date: string; rate: number }[]> {
  const params = new URLSearchParams({ period });
  if (startDate) params.set('startDate', startDate);
  const res = await apiFetch(`/api/stats/completion-rate?${params}`);
  if (!res.ok) throw new Error('获取完成率失败');
  return res.json();
}

export async function fetchSubjectStats(
  startDate?: string,
  endDate?: string
): Promise<Record<string, number>> {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const res = await apiFetch(`/api/stats/subject?${params}`);
  if (!res.ok) throw new Error('获取科目统计失败');
  return res.json();
}

export async function fetchCalendar(
  year: number,
  month: number
): Promise<CalendarData> {
  const res = await apiFetch(`/api/stats/calendar?year=${year}&month=${month}`);
  if (!res.ok) throw new Error('获取日历数据失败');
  return res.json();
}

export async function fetchWeeklyReport(date?: string): Promise<WeeklyReport> {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  const res = await apiFetch(`/api/stats/weekly?${params}`);
  if (!res.ok) throw new Error('获取周报失败');
  return res.json();
}

export async function fetchPointsBalance(): Promise<{ balance: number }> {
  const res = await apiFetch('/api/stats/points-balance');
  if (!res.ok) throw new Error('获取积分余额失败');
  return res.json();
}
