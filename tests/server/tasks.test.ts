import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/server/app';
import { resetDb, todayStr, daysAgo } from '../helpers';

describe('任务 API', () => {
  beforeAll(resetDb);
  beforeEach(resetDb);

  it('创建任务：必填校验', async () => {
    const res = await request(app).post('/api/tasks').send({ name: '语文作业' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('任务名和科目必填');
  });

  it('创建任务：默认值', async () => {
    const res = await request(app).post('/api/tasks').send({ name: '数学作业', subject: '数学' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: '数学作业',
      subject: '数学',
      emoji: '📚',
      estimatedMin: 0,
      repeatType: 'once',
      repeatDays: '[]',
      points: 5,
      isActive: 1,
    });
  });

  it('创建任务：自定义重复类型与积分', async () => {
    const res = await request(app).post('/api/tasks').send({
      name: '练字',
      subject: '语文',
      repeatType: 'weekly',
      repeatDays: [1, 3, 5],
      points: 10,
    });
    expect(res.status).toBe(201);
    expect(res.body.repeatDays).toBe('[1,3,5]');
    expect(res.body.points).toBe(10);
    expect(res.body.repeatType).toBe('weekly');
  });

  it('获取单任务：不存在返回 404', async () => {
    const res = await request(app).get('/api/tasks/9999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('任务不存在');
  });

  it('更新任务：仅更新传入字段', async () => {
    const created = await request(app).post('/api/tasks').send({ name: '原名', subject: '语文', points: 5 });
    const res = await request(app).put(`/api/tasks/${created.body.id}`).send({ name: '新名', points: 8 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: '新名', subject: '语文', points: 8 });
  });

  it('软删除：不再出现在列表', async () => {
    const created = await request(app).post('/api/tasks').send({ name: '要删除', subject: '数学' });
    const del = await request(app).delete(`/api/tasks/${created.body.id}`);
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ ok: true });

    const list = await request(app).get('/api/tasks');
    expect(list.body).toHaveLength(0);

    const single = await request(app).get(`/api/tasks/${created.body.id}`);
    expect(single.status).toBe(200);
    expect(single.body.isActive).toBe(0);
  });

  it('排序接口生效', async () => {
    const a = await request(app).post('/api/tasks').send({ name: 'A', subject: '语文' });
    const b = await request(app).post('/api/tasks').send({ name: 'B', subject: '数学' });
    // A 默认 sortOrder=0，把 A 排到后面
    await request(app).put(`/api/tasks/${a.body.id}/sort`).send({ sortOrder: 1 });

    const res = await request(app).get('/api/tasks');
    expect(res.body.map((t: { name: string }) => t.name)).toEqual(['B', 'A']);
  });

  it('今日任务：daily 展示并反映打卡状态', async () => {
    const created = await request(app).post('/api/tasks').send({ name: '阅读', subject: '语文', repeatType: 'daily' });

    let res = await request(app).get('/api/tasks/today');
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ name: '阅读', isCheckedIn: false, isMakeup: 0, overdueDays: 0 });

    await request(app).post('/api/checkins').send({ taskId: created.body.id, quality: 3 });
    res = await request(app).get('/api/tasks/today');
    expect(res.body[0].isCheckedIn).toBe(true);
    expect(res.body[0].quality).toBe(3);
    expect(res.body[0].checkInId).toBeTruthy();
  });

  it('今日任务：weekly 按星期几过滤', async () => {
    const todayDow = new Date().getDay();
    await request(app).post('/api/tasks').send({
      name: '游泳',
      subject: '体育',
      repeatType: 'weekly',
      repeatDays: [todayDow],
    });
    await request(app).post('/api/tasks').send({
      name: '篮球',
      subject: '体育',
      repeatType: 'weekly',
      repeatDays: [(todayDow + 1) % 7],
    });

    const res = await request(app).get('/api/tasks/today');
    const names = res.body.map((t: { name: string }) => t.name);
    expect(names).toContain('游泳');
    expect(names).not.toContain('篮球');
  });

  it('今日任务：once 按 startDate 展示并计算 overdueDays', async () => {
    await request(app).post('/api/tasks').send({
      name: '手抄报',
      subject: '语文',
      repeatType: 'once',
      startDate: todayStr(),
    });
    const oldTask = await request(app).post('/api/tasks').send({
      name: '旧任务',
      subject: '数学',
      repeatType: 'once',
      startDate: daysAgo(3),
    });

    const res = await request(app).get('/api/tasks/today');
    const names = res.body.map((t: { name: string }) => t.name);
    expect(names).toContain('手抄报');
    expect(names).toContain('旧任务');

    const old = res.body.find((t: { name: string }) => t.name === '旧任务');
    const expectedOverdue = Math.floor((Date.now() - new Date(daysAgo(3)).getTime()) / 86400000);
    expect(old.overdueDays).toBe(expectedOverdue);
    expect(oldTask.body.isActive).toBe(1);
  });

  it('今日任务：once 已打卡完成过的不再显示', async () => {
    const created = await request(app).post('/api/tasks').send({
      name: '一次性',
      subject: '语文',
      repeatType: 'once',
      startDate: daysAgo(2),
    });
    await request(app).post('/api/checkins').send({ taskId: created.body.id, date: daysAgo(1), quality: 2 });

    const res = await request(app).get('/api/tasks/today');
    expect(res.body.map((t: { name: string }) => t.name)).not.toContain('一次性');
  });

  it('指定日期任务：weekly 按目标日期星期几过滤', async () => {
    const target = daysAgo(2);
    const dow = new Date(target).getDay();
    await request(app).post('/api/tasks').send({
      name: '跳绳',
      subject: '体育',
      repeatType: 'weekly',
      repeatDays: [dow],
    });
    await request(app).post('/api/tasks').send({
      name: '无关任务',
      subject: '体育',
      repeatType: 'weekly',
      repeatDays: [(dow + 1) % 7],
    });

    const res = await request(app).get(`/api/tasks/date/${target}`);
    const names = res.body.map((t: { name: string }) => t.name);
    expect(names).toContain('跳绳');
    expect(names).not.toContain('无关任务');
  });

  it('指定日期任务：once 计算 overdueDays 与打卡状态', async () => {
    const target = daysAgo(1);
    const created = await request(app).post('/api/tasks').send({
      name: '补卡任务',
      subject: '语文',
      repeatType: 'once',
      startDate: daysAgo(3),
    });

    let res = await request(app).get(`/api/tasks/date/${target}`);
    const item = res.body.find((t: { name: string }) => t.name === '补卡任务');
    expect(item).toBeDefined();
    expect(item.isCheckedIn).toBe(false);
    expect(item.overdueDays).toBe(
      Math.floor((new Date(target).getTime() - new Date(daysAgo(3)).getTime()) / 86400000)
    );

    await request(app).post('/api/checkins').send({ taskId: created.body.id, date: target, quality: 2 });
    res = await request(app).get(`/api/tasks/date/${target}`);
    expect(res.body.find((t: { name: string }) => t.name === '补卡任务').isCheckedIn).toBe(true);
  });
});
