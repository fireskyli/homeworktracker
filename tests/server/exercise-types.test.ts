import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/server/app';
import { prisma, initPresetExercises } from '../../src/server/db';
import { resetDb } from '../helpers';

async function ensurePassword() {
  await request(app).post('/api/settings/verify').send({ password: '1234' });
}

describe('运动类型 API', () => {
  beforeAll(resetDb);
  beforeEach(async () => {
    await resetDb();
    await ensurePassword();
  });

  it('未设置家长密码时创建 → 403', async () => {
    await resetDb(); // 清掉默认密码设置
    const res = await request(app).post('/api/exercise-types').send({ name: '篮球' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('密码错误');
  });

  it('缺少名称 → 400', async () => {
    const res = await request(app).post('/api/exercise-types').send({ password: '1234' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('运动名称必填');
  });

  it('密码错误 → 403', async () => {
    const res = await request(app).post('/api/exercise-types').send({ name: '篮球', password: 'wrong' });
    expect(res.status).toBe(403);
  });

  it('创建：默认值与 sortOrder 递增', async () => {
    const a = await request(app).post('/api/exercise-types').send({ name: '跳绳', password: '1234' });
    expect(a.status).toBe(201);
    expect(a.body).toMatchObject({ name: '跳绳', emoji: '🏃', unit: '次', isPreset: 0, sortOrder: 1 });

    const b = await request(app).post('/api/exercise-types').send({
      name: '游泳',
      emoji: '🏊',
      unit: '米',
      password: '1234',
    });
    expect(b.body.sortOrder).toBe(2);
    expect(b.body).toMatchObject({ name: '游泳', emoji: '🏊', unit: '米' });
  });

  it('列表按 sortOrder 排序', async () => {
    await request(app).post('/api/exercise-types').send({ name: 'B', password: '1234' });
    await request(app).post('/api/exercise-types').send({ name: 'A', password: '1234' });

    const res = await request(app).get('/api/exercise-types');
    expect(res.status).toBe(200);
    expect(res.body.map((t: { name: string }) => t.name)).toEqual(['B', 'A']);
  });

  it('预设运动类型初始化且幂等', async () => {
    await initPresetExercises();
    expect(await prisma.exerciseType.count()).toBe(6);
    expect(await prisma.exerciseType.count({ where: { isPreset: 1 } })).toBe(6);

    await initPresetExercises();
    expect(await prisma.exerciseType.count()).toBe(6); // 不重复创建
  });

  it('更新：密码错误 403、不存在 404、成功更新字段', async () => {
    const created = await request(app).post('/api/exercise-types').send({ name: '跳绳', password: '1234' });

    const badPwd = await request(app)
      .put(`/api/exercise-types/${created.body.id}`)
      .send({ name: 'X', password: 'wrong' });
    expect(badPwd.status).toBe(403);

    const missing = await request(app)
      .put('/api/exercise-types/9999')
      .send({ name: 'X', password: '1234' });
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('运动类型不存在');

    const ok = await request(app)
      .put(`/api/exercise-types/${created.body.id}`)
      .send({ name: '跳绳升级', emoji: '🪢', unit: '组', password: '1234' });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ name: '跳绳升级', emoji: '🪢', unit: '组' });
  });

  it('删除：密码错误 403、软删除后不在列表', async () => {
    const created = await request(app).post('/api/exercise-types').send({ name: '跳绳', password: '1234' });

    const badPwd = await request(app)
      .delete(`/api/exercise-types/${created.body.id}`)
      .send({ password: 'wrong' });
    expect(badPwd.status).toBe(403);

    const del = await request(app)
      .delete(`/api/exercise-types/${created.body.id}`)
      .send({ password: '1234' });
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ ok: true });

    const list = await request(app).get('/api/exercise-types');
    expect(list.body).toHaveLength(0);
  });
});
