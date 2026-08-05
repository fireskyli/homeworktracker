import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../../src/server/app';
import { resetDb } from '../helpers';

describe('上传 API', () => {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');

  beforeAll(resetDb);
  beforeEach(resetDb);

  it('上传图片成功返回 url 且文件落盘', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('photo', Buffer.from('fake-png-bytes'), {
        filename: 'a.png',
        contentType: 'image/png',
      });
    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);

    const filePath = path.join(uploadsDir, path.basename(res.body.url));
    expect(fs.existsSync(filePath)).toBe(true);
    fs.unlinkSync(filePath); // 清理测试产生的文件
  });

  it('未上传文件 → 400', async () => {
    const res = await request(app).post('/api/upload');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('未上传文件');
  });

  it('非图片类型被 multer 拒绝（当前表现为 500）', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('photo', Buffer.from('x'), {
        filename: 'a.txt',
        contentType: 'text/plain',
      });
    expect(res.status).toBe(500);
  });
});
