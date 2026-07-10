import { CheckIn } from '../types';
import { apiFetch } from '../utils/api';

const API = '/api/checkins';

export async function checkIn(
  taskId: number,
  quality?: number,
  photoUrl?: string,
  date?: string,
  isMakeup?: boolean
): Promise<CheckIn & { earnedPoints: number }> {
  const res = await apiFetch(API, {
    method: 'POST',
    body: JSON.stringify({ taskId, quality, photoUrl, date, isMakeup }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '打卡失败');
  }
  return res.json();
}

export async function cancelCheckIn(id: number): Promise<void> {
  const res = await apiFetch(`${API}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('取消打卡失败');
}

export async function fetchTodayCheckins(): Promise<CheckIn[]> {
  const today = new Date().toISOString().split('T')[0];
  return fetchCheckinsByDate(today);
}

export async function fetchCheckinsByDate(date: string): Promise<CheckIn[]> {
  const res = await apiFetch(`${API}/date/${date}`);
  if (!res.ok) throw new Error('获取打卡记录失败');
  return res.json();
}

export async function fetchCheckinsByRange(
  startDate: string,
  endDate: string
): Promise<CheckIn[]> {
  const res = await apiFetch(`${API}/range?startDate=${startDate}&endDate=${endDate}`);
  if (!res.ok) throw new Error('获取打卡记录失败');
  return res.json();
}
