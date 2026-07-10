import { Redemption } from '../types';
import { apiFetch } from '../utils/api';

const API = '/api/redemptions';

export async function fetchRedemptions(start?: string, end?: string): Promise<Redemption[]> {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await apiFetch(`${API}${query}`);
  if (!res.ok) throw new Error('获取兑换记录失败');
  return res.json();
}

export async function fetchBalance(): Promise<number> {
  const res = await apiFetch(`${API}/balance`);
  if (!res.ok) throw new Error('获取积分余额失败');
  const data = await res.json();
  return data.balance;
}

export async function createRedemption(data: {
  name: string;
  points: number;
  password: string;
  photoUrl?: string;
}): Promise<Redemption> {
  const res = await apiFetch(API, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '兑换失败' }));
    throw new Error(err.error || '兑换失败');
  }
  return res.json();
}

export async function deleteRedemption(id: number, password: string): Promise<void> {
  const res = await apiFetch(`${API}/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '删除失败' }));
    throw new Error(err.error || '删除失败');
  }
}
