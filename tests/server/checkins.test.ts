import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/server/app';
import { resetDb, todayStr, daysAgo } from '../helpers';

async function createTask(points = 5) {
  const res = await request(app).post('/api/tasks').send({ name: '作业', subject: '语文', points });
  expect(res.status).toBe(201);
  return res.body;
}

describe('打卡 API', () => {
  beforeAll(resetDb);
  beforeEach(resetDb);

  it('缺少 taskId → 400', async () => {
    const res = await request(app).post('/api/checkins').send({ quality: 3 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('taskId 必填');
  });

  it('任务不存在 → 404', async () => {
    const res = await request(app).post('/api/checkins').send({ taskId: 9999, quality: 3 });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('任务不存在');
  });

  it('任务已停用 → 404', async () => {
    const task = await createTask();
    await request(app).delete(`/api/tasks/${task.id}`);
    const res = await request(app).post('/api/checkins').send({ taskId: task.id, quality: 3 });
    expect(res.status).toBe(404);
  });

  it('打卡成功：积分 = min(quality, task.points)', async () => {
    const task = await createTask(5);
    const res = await request(app).post('/api/checkins').send({ taskId: task.id, quality: 3 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      taskId: task.id,
      date: todayStr(),
      quality: 3,
      isMakeup: 0,
      earnedPoints: 3,
    });
  });

  it('quality 超过任务积分时封顶', async () => {
    const task = await createTask(2);
    const res = await request(app).post('/api/checkins').send({ taskId: task.id, quality: 3 });
    expect(res.body.earnedPoints).toBe(2);
  });

  it('quality=0 不得分', async () => {
    const task = await createTask(5);
    const res = await request(app).post('/api/checkins').send({ taskId: task.id, quality: 0 });
    expect(res.body.earnedPoints).toBe(0);
  });

  it('同一天重复打卡 → 409', async () => {
    const task = await createTask();
    await request(app).post('/api/checkins').send({ taskId: task.id, quality: 2 });
    const res = await request(app).post('/api/checkins').send({ taskId: task.id, quality: 3 });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('该日期已打卡');
  });

  it('补打卡：自定义日期 + isMakeup', async () => {
    const task = await createTask();
    const res = await request(app).post('/api/checkins').send({
      taskId: task.id,
      date: daysAgo(2),
      quality: 2,
      isMakeup: true,
      note: '补卡',
      photoUrl: '/uploads/x.png',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      date: daysAgo(2),
      isMakeup: 1,
      note: '补卡',
      photoUrl: '/uploads/x.png',
      earnedPoints: 2,
    });
  });

  it('按日期查询', async () => {
    const task = await createTask();
    await request(app).post('/api/checkins').send({ taskId: task.id, date: daysAgo(2), quality: 1 });
    await request(app).post('/api/checkins').send({ taskId: task.id, date: daysAgo(1), quality: 2 });

    const res = await request(app).get(`/api/checkins/date/${daysAgo(1)}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].quality).toBe(2);
  });

  it('日期范围查询', async () => {
    const task = await createTask();
    await request(app).post('/api/checkins').send({ taskId: task.id, date: daysAgo(2), quality: 1 });
    await request(app).post('/api/checkins').send({ taskId: task.id, date: todayStr(), quality: 2 });

    const res = await request(app).get(
      `/api/checkins/range?startDate=${daysAgo(3)}&endDate=${todayStr()}`
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((c: { date: string }) => c.date)).toEqual([daysAgo(2), todayStr()]);
  });

  it('删除打卡', async () => {
    const task = await createTask();
    const checkin = await request(app).post('/api/checkins').send({ taskId: task.id, quality: 1 });

    const del = await request(app).delete(`/api/checkins/${checkin.body.id}`);
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ ok: true });

    const list = await request(app).get(`/api/checkins/date/${todayStr()}`);
    expect(list.body).toHaveLength(0);
  });
});
