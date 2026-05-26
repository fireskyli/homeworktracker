import { Task } from '../types';

const API = '/api/tasks';

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(API);
  if (!res.ok) throw new Error('获取任务失败');
  return res.json();
}

export async function fetchTodayTasks(): Promise<Task[]> {
  const res = await fetch(`${API}/today`);
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
}): Promise<Task> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  }>
): Promise<Task> {
  const res = await fetch(`${API}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('更新任务失败');
  return res.json();
}

export async function deleteTask(id: number): Promise<void> {
  const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('删除任务失败');
}
