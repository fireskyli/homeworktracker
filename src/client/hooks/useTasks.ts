import { Task } from '../types';
import { apiFetch } from '../utils/api';

const API = '/api/tasks';

export async function fetchTasks(): Promise<Task[]> {
  const res = await apiFetch(API);
  if (!res.ok) throw new Error('获取任务失败');
  return res.json();
}

export async function fetchTodayTasks(): Promise<Task[]> {
  const res = await apiFetch(`${API}/today`);
  if (!res.ok) throw new Error('获取今日任务失败');
  return res.json();
}

export async function createTask(data: {
  name: string;
  subject: string;
  emoji?: string;
  estimatedMin?: number;
  deadlineTime?: string;
  repeatType?: string;
  startDate?: string;
  repeatDays?: number[];
  points?: number;
}): Promise<Task> {
  const res = await apiFetch(API, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('创建任务失败');
  return res.json();
}

export async function updateTask(
  id: number,
  data: Partial<{
    name: string;
    subject: string;
    emoji: string;
    estimatedMin: number;
    deadlineTime: string;
    repeatType: string;
    startDate: string;
    repeatDays: number[];
    sortOrder: number;
    isActive: number;
    points: number;
  }>
): Promise<Task> {
  const res = await apiFetch(`${API}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('更新任务失败');
  return res.json();
}

export async function deleteTask(id: number): Promise<void> {
  const res = await apiFetch(`${API}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('删除任务失败');
}

export async function fetchTasksByDate(date: string): Promise<Task[]> {
  const res = await apiFetch(`${API}/date/${date}`);
  if (!res.ok) throw new Error('获取任务失败');
  return res.json();
}
