import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/server/app';
import { resetDb, todayStr, daysAgo } from '../helpers';

async function createTask(name: string, subject: string, points = 5) {
  const res = await request(app).post('/api/tasks').send({ name, subject, points });
  expect(res.status).toBe(201);
  return res.body;
}

async function checkIn(taskId: number, date: string, quality: number) {
  const res = await request(app).post('/api/checkins').send({ taskId, date, quality });
  expect(res.status).toBe(201);
  return res.body;
}

async function ensurePassword() {
  await request(app).post('/api/settings/verify').send({ password: '1234' });
}

describe('统计 API', () => {
  beforeAll(resetDb);
  beforeEach(resetDb);

  it('overview：完成率与连续天数', async () => {
    const t1 = await createTask('语文', '语文');
    const t2 = await createTask('数学', '数学');
    await checkIn(t1.id, todayStr(), 3);
    await checkIn(t1.id, daysAgo(1), 3);

    const res = await request(app).get('/api/stats/overview');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      todayRate: 50,
      weekRate: Math.round((2 / (2 * 7)) * 100),
      currentStreak: 2,
      longestStreak: 2,
      totalCheckins: 2,
    });
  });

  it('overview：无任务时各项为 0', async () => {
    const res = await request(app).get('/api/stats/overview');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      todayRate: 0,
      weekRate: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalCheckins: 0,
    });
  });

  it('points-balance：作业+运动积分减去已审批兑换', async () => {
    await ensurePassword();
    const t1 = await createTask('语文', '语文', 5);
    await checkIn(t1.id, todayStr(), 3);
    await checkIn(t1.id, daysAgo(1), 5); // 封顶 5

    const type = await request(app).post('/api/exercise-types').send({ name: '跳绳', password: '1234' });
    expect(type.status).toBe(201);
    const ex = await request(app).post('/api/exercises').send({ exerciseTypeId: type.body.id, quality: 2 });
    expect(ex.status).toBe(201);

    const redemption = await request(app).post('/api/redemptions').send({
      name: '玩具',
      points: 4,
      password: '1234',
    });
    expect(redemption.status).toBe(201);

    // 待审批的兑换不计入已花费
    let balance = await request(app).get('/api/stats/points-balance');
    expect(balance.body).toEqual({ totalEarned: 3 + 5 + 2, totalSpent: 0, balance: 10 });

    await request(app).post(`/api/redemptions/${redemption.body.id}/approve`).send({ password: '1234' });
    balance = await request(app).get('/api/stats/points-balance');
    expect(balance.body).toEqual({ totalEarned: 10, totalSpent: 4, balance: 6 });
  });

  it('completion-rate：默认近 7 天逐日完成率', async () => {
    const t1 = await createTask('语文', '语文');
    await checkIn(t1.id, todayStr(), 2);

    const res = await request(app).get('/api/stats/completion-rate');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(8); // 从 7 天前到今天（含两端）
    const todayEntry = res.body.find((x: { date: string }) => x.date === todayStr());
    expect(todayEntry.rate).toBe(100);
    const yesterdayEntry = res.body.find((x: { date: string }) => x.date === daysAgo(1));
    expect(yesterdayEntry.rate).toBe(0);
  });

  it('completion-rate：支持 startDate 与 period=month', async () => {
    const t1 = await createTask('语文', '语文');
    await checkIn(t1.id, todayStr(), 2);

    const fromToday = await request(app).get(`/api/stats/completion-rate?startDate=${todayStr()}`);
    expect(fromToday.body).toHaveLength(1);
    expect(fromToday.body[0].rate).toBe(100);

    const month = await request(app).get('/api/stats/completion-rate?period=month');
    const firstOfMonth = `${todayStr().slice(0, 7)}-01`;
    const expectedDays =
      Math.floor((Date.now() - new Date(firstOfMonth).getTime()) / 86400000) + 1;
    expect(month.body.length).toBeGreaterThanOrEqual(expectedDays);
    expect(month.body.length).toBeLessThanOrEqual(31);
  });

  it('completion-rate：无任务时全为 0', async () => {
    const res = await request(app).get('/api/stats/completion-rate');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((x: { rate: number }) => x.rate === 0)).toBe(true);
  });

  it('subject：按科目聚合', async () => {
    const t1 = await createTask('语文一', '语文');
    const t2 = await createTask('数学一', '数学');
    await checkIn(t1.id, todayStr(), 1);
    await checkIn(t2.id, todayStr(), 1);

    const res = await request(app).get('/api/stats/subject');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ 语文: 1, 数学: 1 });
  });

  it('subject：支持日期范围过滤', async () => {
    const t1 = await createTask('语文', '语文');
    await checkIn(t1.id, daysAgo(2), 1);

    const outside = await request(app).get(
      `/api/stats/subject?startDate=${daysAgo(1)}&endDate=${todayStr()}`
    );
    expect(outside.body).toEqual({});

    const inside = await request(app).get(
      `/api/stats/subject?startDate=${daysAgo(3)}&endDate=${todayStr()}`
    );
    expect(inside.body).toEqual({ 语文: 1 });
  });

  it('calendar：返回当月按天计数', async () => {
    const t1 = await createTask('语文', '语文');
    await checkIn(t1.id, todayStr(), 1);
    const [year, month] = todayStr().split('-').map(Number);

    const res = await request(app).get(`/api/stats/calendar?year=${year}&month=${month}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ year, month });
    expect(res.body.days[todayStr().split('-')[2]]).toBe(1);
  });

  it('calendar：缺省参数使用当前年月', async () => {
    const res = await request(app).get('/api/stats/calendar');
    const now = new Date();
    expect(res.status).toBe(200);
    expect(res.body.year).toBe(now.getFullYear());
    expect(res.body.month).toBe(now.getMonth() + 1);
  });

  it('streak：连续与断层', async () => {
    const t1 = await createTask('语文', '语文');
    await checkIn(t1.id, todayStr(), 1);
    await checkIn(t1.id, daysAgo(1), 1);
    await checkIn(t1.id, daysAgo(2), 1);

    const res = await request(app).get('/api/stats/streak');
    expect(res.body).toEqual({ current: 3, longest: 3 });
  });

  it('streak：昨天起算 current，断层不影响最长连续', async () => {
    const t1 = await createTask('语文', '语文');
    await checkIn(t1.id, daysAgo(1), 1);
    await checkIn(t1.id, daysAgo(2), 1);
    await checkIn(t1.id, daysAgo(3), 1);
    // 更早的另一段连续（d4/d5 断层）
    await checkIn(t1.id, daysAgo(6), 1);
    await checkIn(t1.id, daysAgo(7), 1);
    await checkIn(t1.id, daysAgo(8), 1);

    const res = await request(app).get('/api/stats/streak');
    expect(res.body).toEqual({ current: 3, longest: 3 });
  });

  it('weekly：周报汇总', async () => {
    await ensurePassword();
    const t1 = await createTask('阅读', '语文', 5);
    const t2 = await createTask('口算', '数学', 3);
    await checkIn(t1.id, todayStr(), 3);
    await checkIn(t2.id, todayStr(), 3);
    await checkIn(t1.id, daysAgo(1), 3);

    const type = await request(app).post('/api/exercise-types').send({ name: '跳绳', password: '1234' });
    await request(app).post('/api/exercises').send({ exerciseTypeId: type.body.id, quality: 1 });

    const redemption = await request(app).post('/api/redemptions').send({
      name: '零食',
      points: 2,
      password: '1234',
    });
    await request(app).post(`/api/redemptions/${redemption.body.id}/approve`).send({ password: '1234' });

    const res = await request(app).get('/api/stats/weekly');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      totalTasks: 2,
      totalCheckins: 3,
      weekRate: Math.round((3 / 14) * 100),
      checkinDays: 2,
      avgQuality: 3,
      makeupCount: 0,
      photoCount: 0,
      totalPointsEarned: 9,
      totalPointsSpent: 2,
      netPoints: 7,
      balance: 7, // 周报的 balance 只统计作业积分（9）- 兑换（2），不含运动积分
      subjectDist: { 语文: 2, 数学: 1 },
      qualityDist: { 1: 0, 2: 0, 3: 3 },
    });

    expect(res.body.dailyBreakdown).toHaveLength(7);
    const todayEntry = res.body.dailyBreakdown.find((d: { date: string }) => d.date === todayStr());
    expect(todayEntry).toMatchObject({ count: 2, rate: 100, pointsEarned: 6 });
    const yesterdayEntry = res.body.dailyBreakdown.find((d: { date: string }) => d.date === daysAgo(1));
    expect(yesterdayEntry).toMatchObject({ count: 1, rate: 50, pointsEarned: 3 });
    expect(res.body.redemptions).toHaveLength(1);
    expect(res.body.redemptions[0]).toMatchObject({ name: '零食', points: 2 });
  });

  it('weekly：支持指定基准日期', async () => {
    const t1 = await createTask('语文', '语文');
    await checkIn(t1.id, daysAgo(1), 2);

    const res = await request(app).get(`/api/stats/weekly?date=${daysAgo(1)}`);
    expect(res.status).toBe(200);
    expect(res.body.weekStart).toBe(res.body.weekStart); // 不为空即可
    const entry = res.body.dailyBreakdown.find((d: { date: string }) => d.date === daysAgo(1));
    expect(entry).toMatchObject({ count: 1, rate: 100, pointsEarned: 2 });
  });
});
