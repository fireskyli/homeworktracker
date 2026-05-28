import { Exercise, ExerciseSet } from '../types';

const API = '/api/exercises';

export async function fetchExercises(params?: {
  startDate?: string;
  endDate?: string;
  typeId?: number;
}): Promise<Exercise[]> {
  const search = new URLSearchParams();
  if (params?.startDate) search.set('startDate', params.startDate);
  if (params?.endDate) search.set('endDate', params.endDate);
  if (params?.typeId) search.set('typeId', String(params.typeId));
  const query = search.toString() ? `?${search.toString()}` : '';
  const res = await fetch(`${API}${query}`);
  if (!res.ok) throw new Error('获取运动记录失败');
  return res.json();
}

export async function fetchTodayExercises(): Promise<Exercise[]> {
  const res = await fetch(`${API}/today`);
  if (!res.ok) throw new Error('获取今日运动记录失败');
  return res.json();
}

export async function createExercise(data: {
  exerciseTypeId: number;
  date?: string;
  quality?: number;
  sets?: ExerciseSet[];
  note?: string;
}): Promise<Exercise> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '创建失败' }));
    throw new Error(err.error || '创建失败');
  }
  return res.json();
}

export async function deleteExercise(id: number): Promise<void> {
  const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('删除失败');
}
