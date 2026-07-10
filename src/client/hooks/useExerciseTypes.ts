import { ExerciseType } from '../types';
import { apiFetch } from '../utils/api';

const API = '/api/exercise-types';

export async function fetchExerciseTypes(): Promise<ExerciseType[]> {
  const res = await apiFetch(API);
  if (!res.ok) throw new Error('获取运动类型失败');
  return res.json();
}

export async function createExerciseType(data: {
  name: string;
  emoji?: string;
  unit?: string;
  password?: string;
}): Promise<ExerciseType> {
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

export async function updateExerciseType(
  id: number,
  data: Partial<{ name: string; emoji: string; unit: string; sortOrder: number; isActive: number }>
): Promise<ExerciseType> {
  const res = await apiFetch(`${API}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('更新失败');
  return res.json();
}

export async function deleteExerciseType(id: number): Promise<void> {
  const res = await apiFetch(`${API}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('删除失败');
}
