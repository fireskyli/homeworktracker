import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/server/app';
import { resetDb, daysFromNow, daysAgo } from '../helpers';

describe('课程表 API', () => {
  beforeAll(resetDb);
  beforeEach(resetDb);

  it('创建课程：必填校验', async () => {
    const res = await request(app).post('/api/schedules').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('课程名和开始时间必填');
  });

  it('创建课程：默认值', async () => {
    const res = await request(app)
      .post('/api/schedules')
      .send({ name: '数学补习', startTime: '16:30' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: '数学补习',
      type: 'course',
      emoji: '📖',
      repeatType: 'weekly',
      startTime: '16:30',
      endTime: '16:30',
      remindDayBefore: 1,
      remindMinBefore: 30,
      isActive: 1,
    });
    expect(res.body.repeatDays).toEqual([]);
  });

  it('创建课程：补习班 + 每周重复日期', async () => {
    const res = await request(app)
      .post('/api/schedules')
      .send({
        name: '英语外教',
        type: 'tutoring',
        repeatType: 'weekly',
        repeatDays: [1, 3],
        startTime: '18:00',
        endTime: '19:30',
        location: '阳光大厦 5 楼',
      });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('tutoring');
    expect(res.body.repeatDays).toEqual([1, 3]);
    expect(res.body.location).toBe('阳光大厦 5 楼');
  });

  it('创建课程：单次课程', async () => {
    const res = await request(app)
      .post('/api/schedules')
      .send({
        name: '期末考模拟',
        repeatType: 'once',
        date: daysFromNow(3),
        startTime: '09:00',
        endTime: '11:00',
      });
    expect(res.status).toBe(201);
    expect(res.body.repeatType).toBe('once');
    expect(res.body.date).toBe(daysFromNow(3));
  });

  it('获取全部课程：仅返回活跃项', async () => {
    const a = await request(app).post('/api/schedules').send({ name: 'A', startTime: '10:00' });
    const b = await request(app).post('/api/schedules').send({ name: 'B', startTime: '11:00' });
    await request(app).delete(`/api/schedules/${b.body.id}`);

    const res = await request(app).get('/api/schedules');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('A');
  });

  it('获取单个课程：不存在返回 404', async () => {
    const res = await request(app).get('/api/schedules/9999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('课程不存在');
  });

  it('更新课程：仅更新传入字段', async () => {
    const created = await request(app)
      .post('/api/schedules')
      .send({ name: '原名', startTime: '10:00', endTime: '11:00' });
    const res = await request(app)
      .put(`/api/schedules/${created.body.id}`)
      .send({ name: '新名', startTime: '14:00' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: '新名', startTime: '14:00', endTime: '11:00' });
  });

  it('软删除：设置 isActive=0', async () => {
    const created = await request(app).post('/api/schedules').send({ name: '要删', startTime: '10:00' });
    const res = await request(app).delete(`/api/schedules/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const get = await request(app).get(`/api/schedules/${created.body.id}`);
    expect(get.body.isActive).toBe(0);
  });
});