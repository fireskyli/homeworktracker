import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../../src/server/app';
import { resetDb } from '../helpers';

async function ensurePassword() {
  await request(app).post('/api/settings/verify').send({ password: '1234' });
}

describe('商品 API', () => {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');

  beforeAll(resetDb);
  beforeEach(async () => {
    await resetDb();
    await ensurePassword();
  });

  it('列表初始为空', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('创建：缺少名称或积分 → 400', async () => {
    const res = await request(app).post('/api/products').send({ name: '玩具', password: '1234' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('商品名称和积分必填');
  });

  it('创建：密码错误 → 403', async () => {
    const res = await request(app).post('/api/products').send({
      name: '玩具',
      points: 5,
      password: 'wrong',
    });
    expect(res.status).toBe(403);
  });

  it('创建成功 → 201', async () => {
    const res = await request(app).post('/api/products').send({
      name: '小玩具',
      points: 10,
      description: '好玩',
      password: '1234',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: '小玩具',
      points: 10,
      description: '好玩',
      isActive: 1,
      photoUrl: null,
    });
  });

  it('创建商品：支持上传图片', async () => {
    const res = await request(app)
      .post('/api/products')
      .field('name', '玩具')
      .field('points', '5')
      .field('password', '1234')
      .attach('photo', Buffer.from('fake-png'), {
        filename: 'toy.png',
        contentType: 'image/png',
      });
    expect(res.status).toBe(201);
    expect(res.body.photoUrl).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);

    const filePath = path.join(uploadsDir, path.basename(res.body.photoUrl));
    expect(fs.existsSync(filePath)).toBe(true);
    fs.unlinkSync(filePath); // 清理测试产生的文件
  });

  it('更新：密码错误 403、不存在 404、成功', async () => {
    const created = await request(app).post('/api/products').send({
      name: '玩具',
      points: 5,
      password: '1234',
    });

    const badPwd = await request(app)
      .put(`/api/products/${created.body.id}`)
      .send({ name: 'X', password: 'wrong' });
    expect(badPwd.status).toBe(403);

    const missing = await request(app)
      .put('/api/products/9999')
      .send({ name: 'X', password: '1234' });
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('商品不存在');

    const ok = await request(app)
      .put(`/api/products/${created.body.id}`)
      .send({ name: '新玩具', points: 8, password: '1234' });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ name: '新玩具', points: 8 });
  });

  it('更新商品：支持替换图片', async () => {
    const created = await request(app).post('/api/products').send({
      name: '玩具',
      points: 5,
      password: '1234',
    });

    const res = await request(app)
      .put(`/api/products/${created.body.id}`)
      .field('name', '新玩具')
      .field('password', '1234')
      .attach('photo', Buffer.from('fake-png'), {
        filename: 'toy2.png',
        contentType: 'image/png',
      });
    expect(res.status).toBe(200);
    expect(res.body.photoUrl).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);

    const filePath = path.join(uploadsDir, path.basename(res.body.photoUrl));
    expect(fs.existsSync(filePath)).toBe(true);
    fs.unlinkSync(filePath);
  });

  it('删除：密码错误 403、软删除后不在列表', async () => {
    const created = await request(app).post('/api/products').send({
      name: '玩具',
      points: 5,
      password: '1234',
    });

    const badPwd = await request(app)
      .delete(`/api/products/${created.body.id}`)
      .send({ password: 'wrong' });
    expect(badPwd.status).toBe(403);

    const del = await request(app)
      .delete(`/api/products/${created.body.id}`)
      .send({ password: '1234' });
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ ok: true });

    const list = await request(app).get('/api/products');
    expect(list.body).toHaveLength(0);
  });
});
