import { StatsOverview, StreakData, CalendarData } from '../types';

export async function fetchStatsOverview(): Promise<StatsOverview> {
  const res = await fetch('/api/stats/overview');
  if (!res.ok) throw new Error('获取统计失败');
  return res.json();
}

export async function fetchStreak(): Promise<StreakData> {
  const res = await fetch('/api/stats/streak');
  if (!res.ok) throw new Error('获取连续天数失败');
  return res.json();
}

export async function fetchCompletionRate(
  period: 'week' | 'month',
  startDate?: string
): Promise<{ date: string; rate: number }[]> {
  const params = new URLSearchParams({ period });
  if (startDate) params.set('startDate', startDate);
  const res = await fetch(`/api/stats/completion-rate?${params}`);
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
  const res = await fetch(`/api/stats/subject?${params}`);
  if (!res.ok) throw new Error('获取科目统计失败');
  return res.json();
}

export async function fetchCalendar(
  year: number,
  month: number
): Promise<CalendarData> {
  const res = await fetch(`/api/stats/calendar?year=${year}&month=${month}`);
  if (!res.ok) throw new Error('获取日历数据失败');
  return res.json();
}
