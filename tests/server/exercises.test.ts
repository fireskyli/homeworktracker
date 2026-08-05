import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/server/app';
import { resetDb, todayStr, daysAgo } from '../helpers';

async function ensurePassword() {
  await request(app).post('/api/settings/verify').send({ password: '1234' });
}

async function createType(name = '跳绳') {
  const res = await request(app).post('/api/exercise-types').send({ name, password: '1234' });
  expect(res.status).toBe(201);
  return res.body;
}

describe('运动记录 API', () => {
  beforeAll(resetDb);
  beforeEach(async () => {
    await resetDb();
    await ensurePassword();
  });

  it('缺少 exerciseTypeId → 400', async () => {
    const res = await request(app).post('/api/exercises').send({ quality: 2 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('exerciseTypeId 必填');
  });

  it('运动类型不存在或已停用 → 404', async () => {
    const res = await request(app).post('/api/exercises').send({ exerciseTypeId: 9999, quality: 2 });
    expect(res.status).toBe(404);
  });

  it('创建记录：今天不标记补卡，过去日期标记补卡', async () => {
    const type = await createType();
    const today = await request(app).post('/api/exercises').send({
      exerciseTypeId: type.id,
      quality: 3,
    });
    expect(today.status).toBe(201);
    expect(today.body).toMatchObject({ date: todayStr(), isMakeup: 0, quality: 3 });

    const makeup = await request(app).post('/api/exercises').send({
      exerciseTypeId: type.id,
      date: daysAgo(2),
      quality: 1,
    });
    expect(makeup.status).toBe(201);
    expect(makeup.body).toMatchObject({ date: daysAgo(2), isMakeup: 1 });
  });

  it('sets 参数 JSON 往返', async () => {
    const type = await createType();
    const sets = [{ count: 100, unit: '个' }, { count: 80, unit: '个' }];
    const res = await request(app).post('/api/exercises').send({
      exerciseTypeId: type.id,
      sets,
      note: '今天状态不错',
    });
    expect(res.status).toBe(201);
    expect(res.body.sets).toEqual(sets);
    expect(res.body.note).toBe('今天状态不错');
  });

  it('今日记录查询', async () => {
    const type = await createType();
    await request(app).post('/api/exercises').send({ exerciseTypeId: type.id, quality: 2 });
    await request(app).post('/api/exercises').send({
      exerciseTypeId: type.id,
      date: daysAgo(1),
      quality: 1,
    });

    const res = await request(app).get('/api/exercises/today');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].exerciseType.name).toBe('跳绳');
  });

  it('列表查询：日期范围与类型过滤', async () => {
    const t1 = await createType('跳绳');
    const t2 = await createType('跑步');
    await request(app).post('/api/exercises').send({ exerciseTypeId: t1.id, date: daysAgo(2), quality: 2 });
    await request(app).post('/api/exercises').send({ exerciseTypeId: t2.id, date: daysAgo(1), quality: 1 });

    const all = await request(app).get('/api/exercises');
    expect(all.body).toHaveLength(2);

    const filtered = await request(app).get(
      `/api/exercises?startDate=${daysAgo(1)}&endDate=${todayStr()}&typeId=${t1.id}`
    );
    expect(filtered.body).toHaveLength(0);

    const byType = await request(app).get(`/api/exercises?typeId=${t1.id}`);
    expect(byType.body).toHaveLength(1);
    expect(byType.body[0].exerciseType.name).toBe('跳绳');
  });

  it('单条记录查询', async () => {
    const type = await createType();
    const created = await request(app).post('/api/exercises').send({ exerciseTypeId: type.id, quality: 2 });

    const ok = await request(app).get(`/api/exercises/${created.body.id}`);
    expect(ok.status).toBe(200);
    expect(ok.body.quality).toBe(2);

    const missing = await request(app).get('/api/exercises/9999');
    expect(missing.status).toBe(404);
  });

  it('删除记录：不存在 → 404，存在 → ok', async () => {
    const type = await createType();
    const missing = await request(app).delete('/api/exercises/9999');
    expect(missing.status).toBe(404);

    const created = await request(app).post('/api/exercises').send({ exerciseTypeId: type.id, quality: 2 });
    const del = await request(app).delete(`/api/exercises/${created.body.id}`);
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ ok: true });

    const list = await request(app).get('/api/exercises');
    expect(list.body).toHaveLength(0);
  });
});
