import { ExerciseStatsOverview, ExerciseWeeklyReport } from '../types';

const API = '/api/exercise-stats';

export async function fetchExerciseOverview(): Promise<ExerciseStatsOverview> {
  const res = await fetch(`${API}/overview`);
  if (!res.ok) throw new Error('获取运动统计失败');
  return res.json();
}

export async function fetchExerciseByType(): Promise<{ name: string; emoji: string; count: number; totalSuns: number }[]> {
  const res = await fetch(`${API}/by-type`);
  if (!res.ok) throw new Error('获取运动类型统计失败');
  return res.json();
}

export async function fetchExerciseCalendar(
  year: number,
  month: number
): Promise<{ year: number; month: number; days: Record<string, number> }> {
  const res = await fetch(`${API}/calendar?year=${year}&month=${month}`);
  if (!res.ok) throw new Error('获取运动日历失败');
  return res.json();
}

export async function fetchExerciseTrend(period: 'week' | 'month'): Promise<{ date: string; count: number; suns: number }[]> {
  const res = await fetch(`${API}/trend?period=${period}`);
  if (!res.ok) throw new Error('获取运动趋势失败');
  return res.json();
}

export async function fetchExerciseHistory(params?: {
  startDate?: string;
  endDate?: string;
  typeId?: number;
  page?: number;
  pageSize?: number;
}): Promise<{
  exercises: {
    id: number;
    exerciseTypeId: number;
    exerciseType: { name: string; emoji: string; unit: string } | null;
    date: string;
    quality: number | null;
    sets: string | null;
    note: string | null;
    createdAt: string;
  }[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const sp = new URLSearchParams();
  if (params?.startDate) sp.set('startDate', params.startDate);
  if (params?.endDate) sp.set('endDate', params.endDate);
  if (params?.typeId) sp.set('typeId', String(params.typeId));
  if (params?.page) sp.set('page', String(params.page));
  if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
  const res = await fetch(`${API}/history?${sp}`);
  if (!res.ok) throw new Error('获取运动历史失败');
  return res.json();
}

export async function fetchExerciseWeekly(date?: string): Promise<ExerciseWeeklyReport> {
  const sp = new URLSearchParams();
  if (date) sp.set('date', date);
  const res = await fetch(`${API}/weekly?${sp}`);
  if (!res.ok) throw new Error('获取运动周报失败');
  return res.json();
}
