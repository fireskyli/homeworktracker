import { ScheduleAttendance, ScheduleStats } from '../types';
import { apiFetch } from '../utils/api';

const API = '/api/schedules';

export async function fetchAttendances(startDate: string, endDate: string): Promise<ScheduleAttendance[]> {
  const res = await apiFetch(`${API}/attendance?startDate=${startDate}&endDate=${endDate}`);
  if (!res.ok) throw new Error('获取出勤记录失败');
  return res.json();
}

export async function markAttendance(
  scheduleId: number,
  date: string,
  status: 'attended' | 'makeup' | 'absent',
  note?: string
): Promise<ScheduleAttendance> {
  const res = await apiFetch(`${API}/${scheduleId}/attendance`, {
    method: 'POST',
    body: JSON.stringify({ date, status, note }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '标记失败' }));
    throw new Error(err.error || '标记失败');
  }
  return res.json();
}

export async function deleteAttendance(scheduleId: number, date: string): Promise<void> {
  const res = await apiFetch(`${API}/${scheduleId}/attendance?date=${date}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('删除出勤记录失败');
}

export async function fetchScheduleStats(year: number, month: number): Promise<ScheduleStats[]> {
  const res = await apiFetch(`${API}/attendance/stats?year=${year}&month=${month}`);
  if (!res.ok) throw new Error('获取统计数据失败');
  return res.json();
}
