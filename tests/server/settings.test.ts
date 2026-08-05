import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/server/app';
import { resetDb } from '../helpers';

describe('设置 API', () => {
  beforeAll(resetDb);
  beforeEach(resetDb);

  it('首次验证自动初始化默认密码 1234', async () => {
    const ok = await request(app).post('/api/settings/verify').send({ password: '1234' });
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ ok: true });
  });

  it('密码错误 → 401', async () => {
    await request(app).post('/api/settings/verify').send({ password: '1234' });
    const res = await request(app).post('/api/settings/verify').send({ password: '0000' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('密码错误');
  });

  it('修改密码：原密码错误 → 401', async () => {
    const res = await request(app)
      .put('/api/settings/password')
      .send({ oldPassword: '0000', newPassword: '5678' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('原密码错误');
  });

  it('修改密码：新密码过短 → 400', async () => {
    const res = await request(app)
      .put('/api/settings/password')
      .send({ oldPassword: '1234', newPassword: '12' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('新密码至少4位');
  });

  it('修改密码成功并生效', async () => {
    const ok = await request(app)
      .put('/api/settings/password')
      .send({ oldPassword: '1234', newPassword: '5678' });
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ ok: true });

    const old = await request(app).post('/api/settings/verify').send({ password: '1234' });
    expect(old.status).toBe(401);

    const fresh = await request(app).post('/api/settings/verify').send({ password: '5678' });
    expect(fresh.status).toBe(200);
  });
});
