import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/server/app';
import { resetDb, todayStr, daysAgo } from '../helpers';

describe('课程出勤 API', () => {
  let scheduleId: number;

  beforeAll(resetDb);
  beforeEach(async () => {
    await resetDb();
    // 创建一门每周一三五的课
    const res = await request(app)
      .post('/api/schedules')
      .send({
        name: '数学补习',
        type: 'tutoring',
        repeatType: 'weekly',
        repeatDays: [1, 3, 5],
        startTime: '16:00',
        endTime: '17:30',
      });
    scheduleId = res.body.id;
  });

  it('创建出勤记录：首次标记', async () => {
    const date = daysAgo(1); // 昨天
    const res = await request(app)
      .post(`/api/schedules/${scheduleId}/attendance`)
      .send({ date, status: 'attended' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ scheduleId, date, status: 'attended' });
  });

  it('更新出勤记录：同日期重复 POST 更新', async () => {
    const date = daysAgo(2);
    await request(app)
      .post(`/api/schedules/${scheduleId}/attendance`)
      .send({ date, status: 'attended' });
    const res = await request(app)
      .post(`/api/schedules/${scheduleId}/attendance`)
      .send({ date, status: 'absent' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('absent');
  });

  it('状态无效返回 400', async () => {
    const res = await request(app)
      .post(`/api/schedules/${scheduleId}/attendance`)
      .send({ date: daysAgo(1), status: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('缺少日期返回 400', async () => {
    const res = await request(app)
      .post(`/api/schedules/${scheduleId}/attendance`)
      .send({ status: 'attended' });
    expect(res.status).toBe(400);
  });

  it('不存在的课程返回 404', async () => {
    const res = await request(app)
      .post('/api/schedules/99999/attendance')
      .send({ date: daysAgo(1), status: 'attended' });
    expect(res.status).toBe(404);
  });

  it('获取出勤记录', async () => {
    const date1 = daysAgo(1);
    const date2 = daysAgo(2);
    await request(app).post(`/api/schedules/${scheduleId}/attendance`).send({ date: date1, status: 'attended' });
    await request(app).post(`/api/schedules/${scheduleId}/attendance`).send({ date: date2, status: 'absent' });

    const res = await request(app)
      .get(`/api/schedules/attendance?startDate=${date2}&endDate=${date1}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('删除出勤记录', async () => {
    const date = daysAgo(1);
    await request(app).post(`/api/schedules/${scheduleId}/attendance`).send({ date, status: 'attended' });

    const del = await request(app).delete(`/api/schedules/${scheduleId}/attendance?date=${date}`);
    expect(del.status).toBe(200);
    expect(del.body.ok).toBe(true);

    const get = await request(app).get(`/api/schedules/attendance?startDate=${date}&endDate=${date}`);
    expect(get.body).toHaveLength(0);
  });

  // 辅助：找到距今 N 天内最近的指定星期几
  function findWeekdayInPast(targetDay: number, maxLookback = 14): string {
    for (let i = 1; i <= maxLookback; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (d.getDay() === targetDay) {
        return d.toISOString().split('T')[0];
      }
    }
    return daysAgo(1);
  }

  it('月度统计：过去无记录视为缺席', async () => {
    // 课程在周一(1)、三(3)、五(5)，找一个过去的周一
    const pastMonday = findWeekdayInPast(1);
    await request(app).post(`/api/schedules/${scheduleId}/attendance`).send({ date: pastMonday, status: 'attended' });

    const d = new Date(pastMonday);
    const res = await request(app)
      .get(`/api/schedules/attendance/stats?year=${d.getFullYear()}&month=${d.getMonth() + 1}`);
    expect(res.status).toBe(200);

    const stat = res.body.find((s: { scheduleId: number }) => s.scheduleId === scheduleId);
    expect(stat).toBeDefined();
    expect(stat.attended).toBeGreaterThanOrEqual(1);
    // 缺席 + 出勤 + 补上 = 总过去发生次数
    expect(stat.absent + stat.attended + stat.makeup).toBe(stat.total);
  });

  it('月度统计：未来日期不参与', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const year = futureDate.getFullYear();
    const month = futureDate.getMonth() + 1;

    const res = await request(app)
      .get(`/api/schedules/attendance/stats?year=${year}&month=${month}`);
    expect(res.status).toBe(200);
    // 未来月份所有课程 total=0，应被过滤掉
    expect(res.body).toHaveLength(0);
  });
});
