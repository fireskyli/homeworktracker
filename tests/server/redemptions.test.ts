import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/server/app';
import { resetDb, todayStr, daysAgo } from '../helpers';

async function ensurePassword() {
  await request(app).post('/api/settings/verify').send({ password: '1234' });
}

async function createTask(points = 5) {
  const res = await request(app).post('/api/tasks').send({ name: '作业', subject: '语文', points });
  expect(res.status).toBe(201);
  return res.body;
}

async function seedPoints(quality = 3) {
  const task = await createTask(5);
  const res = await request(app).post('/api/checkins').send({ taskId: task.id, quality });
  expect(res.status).toBe(201);
  return res.body;
}

async function createProduct(points: number) {
  const res = await request(app).post('/api/products').send({ name: '小玩具', points, password: '1234' });
  expect(res.status).toBe(201);
  return res.body;
}

describe('兑换 API', () => {
  beforeAll(resetDb);
  beforeEach(async () => {
    await resetDb();
    await ensurePassword();
  });

  it('列表初始为空', async () => {
    const res = await request(app).get('/api/redemptions');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('创建：缺少名称或积分 → 400', async () => {
    const res = await request(app).post('/api/redemptions').send({ name: '玩具', password: '1234' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('兑换名称和积分必填');
  });

  it('创建：密码错误 → 403', async () => {
    const res = await request(app).post('/api/redemptions').send({
      name: '玩具',
      points: 5,
      password: 'wrong',
    });
    expect(res.status).toBe(403);
  });

  it('创建成功 → 201 pending', async () => {
    const res = await request(app).post('/api/redemptions').send({
      name: '玩具',
      points: 10,
      password: '1234',
      date: daysAgo(1),
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: '玩具', points: 10, date: daysAgo(1), status: 'pending' });
  });

  it('列表支持日期过滤', async () => {
    await request(app).post('/api/redemptions').send({
      name: '旧兑换',
      points: 1,
      date: daysAgo(2),
      password: '1234',
    });
    await request(app).post('/api/redemptions').send({
      name: '新兑换',
      points: 2,
      date: todayStr(),
      password: '1234',
    });

    const res = await request(app).get(`/api/redemptions?start=${todayStr()}&end=${todayStr()}`);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('新兑换');
  });

  it('删除：密码错误 403、不存在 404、成功 ok', async () => {
    const created = await request(app).post('/api/redemptions').send({
      name: '玩具',
      points: 1,
      password: '1234',
    });

    const badPwd = await request(app)
      .delete(`/api/redemptions/${created.body.id}`)
      .send({ password: 'wrong' });
    expect(badPwd.status).toBe(403);

    const missing = await request(app)
      .delete('/api/redemptions/9999')
      .send({ password: '1234' });
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('记录不存在');

    const del = await request(app)
      .delete(`/api/redemptions/${created.body.id}`)
      .send({ password: '1234' });
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ ok: true });
  });

  it('balance 接口', async () => {
    const res = await request(app).get('/api/redemptions/balance');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ totalEarned: 0, totalSpent: 0, balance: 0 });
  });

  it('apply：缺少商品 ID → 400', async () => {
    const res = await request(app).post('/api/redemptions/apply').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('商品ID必填');
  });

  it('apply：商品不存在或已下架 → 404', async () => {
    const res = await request(app).post('/api/redemptions/apply').send({ productId: 9999 });
    expect(res.status).toBe(404);
  });

  it('apply：积分不足 → 400', async () => {
    const product = await createProduct(100);
    const res = await request(app).post('/api/redemptions/apply').send({ productId: product.id });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('积分不足');
  });

  it('apply：成功创建待审批兑换', async () => {
    await seedPoints(3);
    const product = await createProduct(2);

    const res = await request(app).post('/api/redemptions/apply').send({ productId: product.id });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: '小玩具',
      points: 2,
      status: 'pending',
      productId: product.id,
    });
  });

  it('approve：审批通过流程与状态守卫', async () => {
    await seedPoints(3);
    const product = await createProduct(2);
    const applied = await request(app).post('/api/redemptions/apply').send({ productId: product.id });
    const id = applied.body.id;

    const badPwd = await request(app).post(`/api/redemptions/${id}/approve`).send({ password: 'wrong' });
    expect(badPwd.status).toBe(403);

    const ok = await request(app).post(`/api/redemptions/${id}/approve`).send({ password: '1234' });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('approved');
    expect(ok.body.approvedAt).toBeTruthy();

    const again = await request(app).post(`/api/redemptions/${id}/approve`).send({ password: '1234' });
    expect(again.status).toBe(400);
    expect(again.body.error).toContain('approved');

    const missing = await request(app)
      .post('/api/redemptions/9999/approve')
      .send({ password: '1234' });
    expect(missing.status).toBe(404);
  });

  it('reject：拒绝流程与状态守卫', async () => {
    await seedPoints(3);
    const product = await createProduct(2);
    const applied = await request(app).post('/api/redemptions/apply').send({ productId: product.id });
    const id = applied.body.id;

    const ok = await request(app).post(`/api/redemptions/${id}/reject`).send({ password: '1234' });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('rejected');

    const approveAfterReject = await request(app)
      .post(`/api/redemptions/${id}/approve`)
      .send({ password: '1234' });
    expect(approveAfterReject.status).toBe(400);
  });
});
