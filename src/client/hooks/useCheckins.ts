import { CheckIn } from '../types';

const API = '/api/checkins';

export async function checkIn(
  taskId: number,
  quality?: number,
  photoUrl?: string
): Promise<CheckIn> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, quality, photoUrl }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '打卡失败');
  }
  return res.json();
}

export async function cancelCheckIn(id: number): Promise<void> {
  const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('取消打卡失败');
}

export async function fetchTodayCheckins(): Promise<CheckIn[]> {
  const today = new Date().toISOString().split('T')[0];
  return fetchCheckinsByDate(today);
}

export async function fetchCheckinsByDate(date: string): Promise<CheckIn[]> {
  const res = await fetch(`${API}/date/${date}`);
  if (!res.ok) throw new Error('获取打卡记录失败');
  return res.json();
}

export async function fetchCheckinsByRange(
  startDate: string,
  endDate: string
): Promise<CheckIn[]> {
  const res = await fetch(`${API}/range?startDate=${startDate}&endDate=${endDate}`);
  if (!res.ok) throw new Error('获取打卡记录失败');
  return res.json();
}
