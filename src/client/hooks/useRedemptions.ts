import { Redemption } from '../types';

const API = '/api/redemptions';

export async function fetchRedemptions(start?: string, end?: string): Promise<Redemption[]> {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API}${query}`);
  if (!res.ok) throw new Error('获取兑换记录失败');
  return res.json();
}

export async function fetchBalance(): Promise<number> {
  const res = await fetch(`${API}/balance`);
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
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '兑换失败' }));
    throw new Error(err.error || '兑换失败');
  }
  return res.json();
}

export async function deleteRedemption(id: number, password: string): Promise<void> {
  const res = await fetch(`${API}/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '删除失败' }));
    throw new Error(err.error || '删除失败');
  }
}
