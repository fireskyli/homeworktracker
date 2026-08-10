import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/server/app';
import { prisma, initSentinelUser } from '../../src/server/db';
import { resetDb } from '../helpers';

// mock 钉钉发送，避免真实网络请求
vi.mock('../../src/server/notifier', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/server/notifier')>();
  return {
    ...actual,
    sendDingtalkMarkdown: vi.fn().mockResolvedValue({ ok: true }),
  };
});

import {
  buildTodayTaskMarkdown,
  buildDailySummaryMarkdown,
  buildWeeklySummaryMarkdown,
} from '../../src/server/notifier';
import {
  getTodayTasks,
  getDailyStats,
  getWeeklyStats,
  pushTodayTasks,
  pushDailySummary,
  pushWeeklySummary,
} from '../../src/server/task-push';
import { getPushConfig, savePushConfig } from '../../src/server/schedule-push';

describe('学习任务 Markdown 构建', () => {
  it('buildTodayTaskMarkdown：有任务时列出任务', () => {
    const md = buildTodayTaskMarkdown([
      { name: '数学口算', subject: '数学', emoji: '🔢', estimatedMin: 10 },
      { name: '英语阅读', subject: '英语', emoji: '📖', estimatedMin: 20 },
    ]);
    expect(md).toContain('今日学习任务');
    expect(md).toContain('励夏的课程');
    expect(md).toContain('数学口算');
    expect(md).toContain('🔢');
    expect(md).toContain('约 10 分钟');
    expect(md).toContain('共 2 项');
  });

  it('buildTodayTaskMarkdown：无任务时提示休息', () => {
    const md = buildTodayTaskMarkdown([]);
    expect(md).toContain('今天没有安排学习任务');
  });

  it('buildDailySummaryMarkdown：含完成数与积分', () => {
    const md = buildDailySummaryMarkdown({
      date: '2026-08-09',
      total: 3,
      done: 2,
      rate: 67,
      pointsEarned: 6,
      items: [
        { name: '口算', subject: '数学', emoji: '🔢', quality: 3, pointsEarned: 3 },
        { name: '阅读', subject: '语文', emoji: '📖', quality: 3, pointsEarned: 3 },
      ],
      undoneItems: [{ name: '练字', subject: '语文', emoji: '✍️', estimatedMin: 15 }],
      exerciseSummary: {
        total: 2,
        suns: 5,
        byType: [{ name: '跳绳', emoji: '🪢', count: 2, suns: 5 }],
      },
      minSuns: 3,
    });
    expect(md).toContain('励夏的课程');
    expect(md).toContain('共 3 项，完成 2 项（67%）');
    expect(md).toContain('获得积分：**6**');
    expect(md).toContain('口算');
    expect(md).toContain('⭐⭐⭐');
    expect(md).toContain('未完成');
    expect(md).toContain('练字');
    expect(md).toContain('约 15 分钟');
    expect(md).toContain('今日运动');
    expect(md).toContain('🪢');
    expect(md).toContain('跳绳 2次 ☀️5');
    expect(md).toContain('今日太阳：**☀️ 5 / 3**');
    expect(md).toContain('已达到今日运动目标');
  });

  it('buildWeeklySummaryMarkdown：含周统计与科目分布', () => {
    const md = buildWeeklySummaryMarkdown({
      weekStart: '2026-08-03',
      weekEnd: '2026-08-09',
      total: 4,
      done: 20,
      rate: 71,
      checkinDays: 6,
      pointsEarned: 40,
      subjectDist: { 数学: 8, 语文: 12 },
      taskDetails: [
        { name: '数学口算', subject: '数学', emoji: '🔢', doneCount: 7, missed: false },
        { name: '练字', subject: '语文', emoji: '✍️', doneCount: 0, missed: true },
      ],
      exerciseSummary: {
        total: 5,
        suns: 12,
        byType: [{ name: '跳绳', emoji: '🪢', count: 5, suns: 12 }],
      },
    });
    expect(md).toContain('励夏的课程');
    expect(md).toContain('2026-08-03 ~ 2026-08-09');
    expect(md).toContain('完成率 **71%**');
    expect(md).toContain('打卡天数：**6** 天');
    expect(md).toContain('数学：8 次');
    expect(md).toContain('语文：12 次');
    expect(md).toContain('已完成任务');
    expect(md).toContain('数学口算');
    expect(md).toContain('未完成任务');
    expect(md).toContain('练字');
    expect(md).toContain('本周运动');
    expect(md).toContain('跳绳');
    expect(md).toContain('☀️');
  });

});

describe('学习任务统计函数', () => {
  beforeAll(resetDb);
  beforeEach(async () => {
    await resetDb();
    await initSentinelUser();
    // 初始化家长密码
    await request(app).post('/api/settings/verify').send({ password: '1234' });
  });

  it('getTodayTasks：每日任务和当天一次性任务返回', async () => {
    // 创建每日任务
    await request(app).post('/api/tasks').send({
      name: '每日口算', subject: '数学', emoji: '🔢', repeatType: 'daily',
    });
    // 创建今天的单次任务
    const today = new Date().toISOString().split('T')[0];
    await request(app).post('/api/tasks').send({
      name: '今天测验', subject: '英语', emoji: '📖', repeatType: 'once', startDate: today,
    });

    const items = await getTodayTasks(0);
    expect(items.some(i => i.name === '每日口算')).toBe(true);
    expect(items.some(i => i.name === '今天测验')).toBe(true);
  });

  it('getDailyStats：统计当天完成数与积分（积分=min(quality,points)）', async () => {
    // 创建任务（积分上限 3）
    const task = await request(app).post('/api/tasks').send({
      name: '口算', subject: '数学', emoji: '🔢', repeatType: 'daily', points: 3,
    });
    const taskId = task.body.id;
    const today = new Date().toISOString().split('T')[0];

    // 打卡（质量3星 → 积3分）
    await request(app).post('/api/checkins').send({ taskId, date: today, quality: 3 });

    const stats = await getDailyStats(today, 0);
    expect(stats.total).toBe(1);
    expect(stats.done).toBe(1);
    expect(stats.rate).toBe(100);
    expect(stats.pointsEarned).toBe(3);
    expect(stats.items[0].name).toBe('口算');
    expect(stats.items[0].pointsEarned).toBe(3);
  });

  it('getDailyStats：包含未完成列表和运动数据', async () => {
    // 创建任务（积分上限 3）
    const task = await request(app).post('/api/tasks').send({
      name: '口算', subject: '数学', emoji: '🔢', repeatType: 'daily', points: 3,
    });
    const taskId = task.body.id;
    const today = new Date().toISOString().split('T')[0];

    // 运动类型（需要家长密码）
    const exType = await request(app).post('/api/exercise-types').send({
      name: '跳绳', emoji: '🪢', unit: '次', password: '1234',
    });
    expect(exType.status).toBe(201);
    const exTypeId = exType.body.id;

    // 运动记录
    const exRes = await request(app).post('/api/exercises').send({
      exerciseTypeId: exTypeId, date: today, quality: 3,
    });
    expect(exRes.status).toBe(201);

    // 打卡口算 → 完成
    await request(app).post('/api/checkins').send({ taskId, date: today, quality: 3 });

    const stats = await getDailyStats(today, 0);
    expect(stats.undoneItems).toHaveLength(0); // 全部完成
    expect(stats.exerciseSummary.total).toBe(1);
    expect(stats.exerciseSummary.suns).toBe(3);
    expect(stats.exerciseSummary.byType[0].name).toBe('跳绳');
  });

  it('getDailyStats：未完成列表包含未打卡任务', async () => {
    // 创建两个任务，只完成一个
    const task1 = await request(app).post('/api/tasks').send({
      name: '口算', subject: '数学', emoji: '🔢', repeatType: 'daily', points: 3,
    });
    await request(app).post('/api/tasks').send({
      name: '阅读', subject: '语文', emoji: '📖', repeatType: 'daily', points: 2,
    });
    const today = new Date().toISOString().split('T')[0];

    // 只打卡口算
    await request(app).post('/api/checkins').send({ taskId: task1.body.id, date: today, quality: 3 });

    const stats = await getDailyStats(today, 0);
    expect(stats.done).toBe(1);
    expect(stats.undoneItems.length).toBeGreaterThanOrEqual(1);
    expect(stats.undoneItems.some(i => i.name === '阅读')).toBe(true);
  });

  it('getDailyStats：total 只统计今日应做任务（与今日任务推送同口径）', async () => {
    // 每日任务（今天要做）
    await request(app).post('/api/tasks').send({
      name: '每日口算', subject: '数学', emoji: '🔢', repeatType: 'daily', points: 3,
    });
    // 仅周五做的每周任务（周一执行时今天不应计入）
    await request(app).post('/api/tasks').send({
      name: '周五奥数', subject: '数学', emoji: '🧩', repeatType: 'weekly', repeatDays: '[5]', points: 5,
    });
    const today = new Date().toISOString().split('T')[0];

    const stats = await getDailyStats(today, 0);
    // 若今天是周五，则两个都该算；否则只算每日任务
    const todayDow = new Date().getDay();
    const expectedTotal = todayDow === 5 ? 2 : 1;
    expect(stats.total).toBe(expectedTotal);
  });

  it('getWeeklyStats：统计自然周完成情况', async () => {
    const task = await request(app).post('/api/tasks').send({
      name: '每日阅读', subject: '语文', emoji: '📖', repeatType: 'daily', points: 2,
    });
    const taskId = task.body.id;
    const today = new Date().toISOString().split('T')[0];

    await request(app).post('/api/checkins').send({ taskId, date: today, quality: 2 });

    // 本周一
    const dow = new Date().getDay() || 7;
    const monday = new Date();
    monday.setDate(monday.getDate() - dow + 1);
    const weekStart = monday.toISOString().split('T')[0];

    const stats = await getWeeklyStats(weekStart, 0);
    expect(stats.done).toBe(1);
    expect(stats.checkinDays).toBe(1);
    expect(stats.pointsEarned).toBe(2);
    expect(stats.subjectDist['语文']).toBe(1);
  });

  it('getWeeklyStats：包含任务详情和运动数据', async () => {
    // 直接创建任务
    const mathTask = await prisma.task.create({
      data: {
        name: '数学口算', subject: '数学', emoji: '🔢', repeatType: 'daily', points: 3,
        userId: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
    });
    await prisma.task.create({
      data: {
        name: '练字', subject: '语文', emoji: '✍️', repeatType: 'daily', points: 2,
        userId: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
    });
    const today = new Date().toISOString().split('T')[0];

    // 只打卡数学口算（练字未完成）
    await request(app).post('/api/checkins').send({ taskId: mathTask.id, date: today, quality: 3 });

    // 运动
    const exType = await prisma.exerciseType.create({
      data: { name: '跳绳', emoji: '🪢', unit: '次', userId: 0, createdAt: new Date().toISOString() },
    });
    await prisma.exercise.create({
      data: {
        exerciseTypeId: exType.id, date: today, quality: 2, userId: 0,
        completedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
      },
    });

    // 本周一
    const dow = new Date().getDay() || 7;
    const monday = new Date();
    monday.setDate(monday.getDate() - dow + 1);
    const weekStart = monday.toISOString().split('T')[0];

    const stats = await getWeeklyStats(weekStart, 0);
    expect(stats.taskDetails.length).toBeGreaterThanOrEqual(2);
    expect(stats.taskDetails.filter(t => t.missed).length).toBeGreaterThanOrEqual(1);
    expect(stats.exerciseSummary.total).toBe(1);
    expect(stats.exerciseSummary.suns).toBe(2);
  });

  it('getWeeklyStats：过期的一次性任务不计入本周任务（回归）', async () => {
    // 创建本周应做的 daily 任务
    const dailyTask = await prisma.task.create({
      data: {
        name: '每日阅读', subject: '语文', emoji: '📖', repeatType: 'daily', points: 2,
        userId: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
    });
    // 创建早已过期并已完成的一次性任务（startDate 在很久以前 + 已打卡），
    // 它不应再出现在"本周应做/未完成"列表里。
    const expiredTask = await prisma.task.create({
      data: {
        name: '期末卷', subject: '语文', emoji: '📚', repeatType: 'once',
        startDate: '2020-01-01', points: 3,
        userId: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
    });
    await prisma.checkIn.create({
      data: {
        taskId: expiredTask.id, date: '2020-01-01', quality: 3, userId: 0,
        completedAt: new Date().toISOString(),
      },
    });

    // 本周一
    const dow = new Date().getDay() || 7;
    const monday = new Date();
    monday.setDate(monday.getDate() - dow + 1);
    const weekStart = monday.toISOString().split('T')[0];

    const stats = await getWeeklyStats(weekStart, 0);
    // 已完成过的过期 once 任务不应出现在 taskDetails 里
    expect(stats.taskDetails.some(t => t.name === '期末卷')).toBe(false);
    expect(stats.taskDetails.some(t => t.name === '每日阅读')).toBe(true);
  });
});

describe('学习任务推送', () => {
  beforeAll(resetDb);
  beforeEach(resetDb);

  it('推送今日任务：未开启返回 false', async () => {
    const ok = await pushTodayTasks(0);
    expect(ok).toBe(false);
  });

  it('推送今日任务：开启后成功并写入去重标记', async () => {
    await savePushConfig(
      { webhook: 'https://oapi.dingtalk.com/robot/send?access_token=t1', enabled: true },
      0
    );
    const ok = await pushTodayTasks(0);
    expect(ok).toBe(true);
    // 再次推送因去重也会成功（手动推送忽略去重，但这里直接调用函数会再次发送）
  });

  it('推送今日总结：开启后成功', async () => {
    await savePushConfig(
      { webhook: 'https://oapi.dingtalk.com/robot/send?access_token=t1', enabled: true },
      0
    );
    const ok = await pushDailySummary(0);
    expect(ok).toBe(true);
  });

  it('推送本周总结：开启后成功', async () => {
    await savePushConfig(
      { webhook: 'https://oapi.dingtalk.com/robot/send?access_token=t1', enabled: true },
      0
    );
    const ok = await pushWeeklySummary(0);
    expect(ok).toBe(true);
  });

  it('手动推送端点：开启后返回 200', async () => {
    await savePushConfig(
      { webhook: 'https://oapi.dingtalk.com/robot/send?access_token=api', enabled: true },
      0
    );
    const res = await request(app).post('/api/schedule-push-config/task/today');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('手动推送端点：未开启时返回 400', async () => {
    await savePushConfig(
      { webhook: 'https://oapi.dingtalk.com/robot/send?access_token=api', enabled: false },
      0
    );
    const res = await request(app).post('/api/schedule-push-config/task/today');
    expect(res.status).toBe(400);
  });
});