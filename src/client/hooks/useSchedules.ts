import { ScheduleEntry } from '../types';
import { apiFetch } from '../utils/api';

const API = '/api/schedules';

export async function fetchSchedules(): Promise<ScheduleEntry[]> {
  const res = await apiFetch(API);
  if (!res.ok) throw new Error('获取课程失败');
  return res.json();
}

export async function createSchedule(data: {
  name: string;
  type?: string;
  emoji?: string;
  repeatType?: string;
  repeatDays?: number[];
  date?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  appName?: string;
  remindDayBefore?: number;
  remindMinBefore?: number;
}): Promise<ScheduleEntry> {
  const res = await apiFetch(API, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '创建失败' }));
    throw new Error(err.error || '创建失败');
  }
  return res.json();
}

export async function updateSchedule(
  id: number,
  data: Partial<{
    name: string;
    type: string;
    emoji: string;
    repeatType: string;
    repeatDays: number[];
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    appName: string;
    remindDayBefore: number;
    remindMinBefore: number;
    isActive: number;
  }>
): Promise<ScheduleEntry> {
  const res = await apiFetch(`${API}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('更新课程失败');
  return res.json();
}

export async function deleteSchedule(id: number): Promise<void> {
  const res = await apiFetch(`${API}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('删除课程失败');
}

export interface ScheduleReminder {
  scheduleId: number | null;
  name: string;
  emoji: string;
  type: string;
  startTime: string;
  location: string;
  occ: string;
  kind: 'day' | 'minute';
}

export async function fetchDueReminders(): Promise<ScheduleReminder[]> {
  const res = await apiFetch(`${API}/reminders/now`);
  if (!res.ok) return [];
  return res.json();
}

// ── 推送配置 ──────────────────────────────
export interface PushConfig {
  webhook: string;
  enabled: boolean;
}

export async function fetchPushConfig(): Promise<PushConfig> {
  const res = await apiFetch('/api/schedule-push-config');
  if (!res.ok) return { webhook: '', enabled: false };
  return res.json();
}

export async function savePushConfig(config: PushConfig): Promise<PushConfig> {
  const res = await apiFetch('/api/schedule-push-config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '保存失败' }));
    throw new Error(err.error || '保存失败');
  }
  return res.json();
}

export async function testPush(webhook: string): Promise<boolean> {
  const res = await apiFetch('/api/schedule-push-config/test', {
    method: 'POST',
    body: JSON.stringify({ webhook }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '测试失败' }));
    throw new Error(err.error || '测试失败');
  }
  return true;
}
