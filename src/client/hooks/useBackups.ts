export interface BackupInfo {
  name: string;
  size: number;
  time: string;
}

const API = '/api/backup';

export async function fetchBackups(): Promise<BackupInfo[]> {
  const res = await fetch(API);
  if (!res.ok) throw new Error('获取备份列表失败');
  return res.json();
}

export async function createBackup(): Promise<{ ok: boolean; path: string }> {
  const res = await fetch(API, { method: 'POST' });
  if (!res.ok) throw new Error('备份失败');
  return res.json();
}

export async function restoreBackup(name: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '恢复失败');
  }
  return res.json();
}

export async function importBackup(file: File): Promise<{ ok: boolean }> {
  const formData = new FormData();
  formData.append('backup', file);
  const res = await fetch(`${API}/import`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '导入失败');
  }
  return res.json();
}
