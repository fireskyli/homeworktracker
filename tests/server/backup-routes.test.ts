import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/server/backup', () => ({
  backupDatabase: vi.fn(),
  listBackups: vi.fn(),
  restoreBackup: vi.fn(),
}));

import app from '../../src/server/app';
import { backupDatabase, listBackups, restoreBackup } from '../../src/server/backup';
import { resetDb } from '../helpers';

describe('备份路由 API', () => {
  beforeAll(resetDb);
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/backup 返回备份列表', async () => {
    vi.mocked(listBackups).mockReturnValue([{ name: 'a.db', size: 1, time: 't' }]);

    const res = await request(app).get('/api/backup');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ name: 'a.db', size: 1, time: 't' }]);
  });

  it('POST /api/backup 手动备份成功', async () => {
    vi.mocked(backupDatabase).mockReturnValue('C:/backups/x.db');

    const res = await request(app).post('/api/backup');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, path: 'C:/backups/x.db' });
  });

  it('POST /api/backup 备份失败 → 500', async () => {
    vi.mocked(backupDatabase).mockReturnValue(null);

    const res = await request(app).post('/api/backup');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('备份失败');
  });

  it('POST /api/backup/restore 缺少文件名 → 400', async () => {
    const res = await request(app).post('/api/backup/restore').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('请指定备份文件名');
  });

  it('POST /api/backup/restore 恢复成功', async () => {
    vi.mocked(restoreBackup).mockReturnValue(true);

    const res = await request(app).post('/api/backup/restore').send({ name: 'x.db' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('POST /api/backup/restore 恢复失败 → 500', async () => {
    vi.mocked(restoreBackup).mockReturnValue(false);

    const res = await request(app).post('/api/backup/restore').send({ name: 'x.db' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('恢复失败');
  });

  it('POST /api/backup/import 未选择文件 → 400', async () => {
    const res = await request(app).post('/api/backup/import');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('请选择备份文件');
  });

  it('POST /api/backup/import 非 .db 文件被 multer 拒绝（当前表现为 500）', async () => {
    const res = await request(app)
      .post('/api/backup/import')
      .attach('backup', Buffer.from('x'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });
    expect(res.status).toBe(500);
  });
});
