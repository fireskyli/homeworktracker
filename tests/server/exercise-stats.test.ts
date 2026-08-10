import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/server/app';
import { resetDb, todayStr, daysAgo, thisWeekDay } from '../helpers';

async function ensurePassword() {
  await request(app).post('/api/settings/verify').send({ password: '1234' });
}

async function createType(name: string) {
  const res = await request(app).post('/api/exercise-types').send({ name, password: '1234' });
  expect(res.status).toBe(201);
  return res.body;
}

async function createExercise(typeId: number, date: string, quality: number) {
  const res = await request(app).post('/api/exercises').send({ exerciseTypeId: typeId, date, quality });
  expect(res.status).toBe(201);
  return res.body;
}

describe('运动统计 API', () => {
  beforeAll(resetDb);
  beforeEach(async () => {
    await resetDb();
    await ensurePassword();
  });

  it('overview：今日/本周/总次数与太阳数', async () => {
    const t = await createType('跳绳');
    await createExercise(t.id, todayStr(), 2);
    await createExercise(t.id, todayStr(), 1);
    await createExercise(t.id, daysAgo(1), 3);

    const res = await request(app).get('/api/exercise-stats/overview');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      todayCount: 2,
      weekCount: 3,
      todaySuns: 3,
      totalSuns: 6,
      currentStreak: 2,
      longestStreak: 2,
      totalExercises: 3,
    });
  });

  it('by-type：按运动类型聚合', async () => {
    const t1 = await createType('跳绳');
    const t2 = await createType('跑步');
    await createExercise(t1.id, todayStr(), 2);
    await createExercise(t1.id, daysAgo(1), 1);
    await createExercise(t2.id, todayStr(), 3);

    const res = await request(app).get('/api/exercise-stats/by-type');
    expect(res.body).toHaveLength(2);
    const rope = res.body.find((x: { name: string }) => x.name === '跳绳');
    const run = res.body.find((x: { name: string }) => x.name === '跑步');
    expect(rope).toMatchObject({ count: 2, totalSuns: 3 });
    expect(run).toMatchObject({ count: 1, totalSuns: 3 });
  });

  it('calendar：按天计数', async () => {
    const t = await createType('跳绳');
    await createExercise(t.id, todayStr(), 1);
    const [year, month] = todayStr().split('-').map(Number);

    const res = await request(app).get(`/api/exercise-stats/calendar?year=${year}&month=${month}`);
    expect(res.status).toBe(200);
    expect(res.body.days[todayStr().split('-')[2]]).toBe(1);
  });

  it('trend：近 N 天逐日数据', async () => {
    const t = await createType('跳绳');
    await createExercise(t.id, todayStr(), 2);
    await createExercise(t.id, daysAgo(1), 1);

    const res = await request(app).get('/api/exercise-stats/trend?days=3');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4); // 3 天前到今天（含两端）
    const todayEntry = res.body.find((x: { date: string }) => x.date === todayStr());
    expect(todayEntry).toMatchObject({ count: 1, suns: 2 });
    const fromEntry = res.body.find((x: { date: string }) => x.date === daysAgo(3));
    expect(fromEntry).toMatchObject({ count: 0, suns: 0 });
  });

  it('trend：缺省参数为近 7 天', async () => {
    const res = await request(app).get('/api/exercise-stats/trend');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(8);
  });

  it('history：分页与排序', async () => {
    const t = await createType('跳绳');
    const e1 = await createExercise(t.id, daysAgo(1), 2);
    const e2 = await createExercise(t.id, daysAgo(2), 1);
    const e3 = await createExercise(t.id, daysAgo(3), 3);

    const res = await request(app).get('/api/exercise-stats/history?page=1&pageSize=2');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 3, page: 1, pageSize: 2, totalPages: 2 });
    expect(res.body.exercises).toHaveLength(2);
    expect(res.body.exercises.map((x: { id: number }) => x.id)).toEqual([e1.id, e2.id]);

    const page2 = await request(app).get('/api/exercise-stats/history?page=2&pageSize=2');
    expect(page2.body.exercises).toHaveLength(1);
    expect(page2.body.exercises[0].id).toBe(e3.id);
  });

  it('history：缺省参数', async () => {
    const t = await createType('跳绳');
    await createExercise(t.id, todayStr(), 1);

    const res = await request(app).get('/api/exercise-stats/history');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, pageSize: 20, total: 1, totalPages: 1 });
    expect(res.body.exercises).toHaveLength(1);
  });

  it('weekly：运动周报', async () => {
    const t = await createType('跳绳');
    // 用本周一、本周二两个固定日期造数，保证无论哪天运行都落在当前周报范围内
    // （周报按"本周一~本周日"统计；若用 daysAgo(1)，周一运行时昨天会落到上周）。
    const dayA = thisWeekDay(1); // 本周一
    const dayB = thisWeekDay(2); // 本周二
    await createExercise(t.id, dayA, 2);
    await createExercise(t.id, dayB, 1);

    const res = await request(app).get('/api/exercise-stats/weekly');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      totalExercises: 2,
      totalSuns: 3,
      exerciseDays: 2,
      // 非今天创建的记录会被标记补卡。makeupCount = 两个造数日中非今天的数量，
      // 随运行日动态变化（周一运行时 dayA=今天，周二运行时 dayB=今天，其余两天都非今天）。
      makeupCount: [dayA, dayB].filter(d => d !== todayStr()).length,
    });
    expect(res.body.dailyBreakdown).toHaveLength(7);
    const dayAEntry = res.body.dailyBreakdown.find((d: { date: string }) => d.date === dayA);
    expect(dayAEntry).toMatchObject({ count: 1, suns: 2 });
    expect(dayAEntry.exercises).toHaveLength(1);
    expect(dayAEntry.exercises[0]).toMatchObject({ name: '跳绳', quality: 2 });
    expect(res.body.typeDist).toHaveLength(1);
    expect(res.body.typeDist[0]).toMatchObject({ name: '跳绳', count: 2, suns: 3 });
  });
});
