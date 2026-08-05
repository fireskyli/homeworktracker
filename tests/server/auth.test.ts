import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { resetDb } from '../helpers';

describe('单机模式认证', () => {
  let app: Awaited<typeof import('../../src/server/app')>['default'];

  beforeAll(async () => {
    process.env.DEPLOYMENT_MODE = 'standalone';
    vi.resetModules();
    app = (await import('../../src/server/app')).default;
    await resetDb();
  });

  beforeEach(async () => {
    await resetDb();
  });

  it('register → 403（当前模式不支持注册）', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: '123456', displayName: 'A' });
    expect(res.status).toBe(403);
  });

  it('login → 403（当前模式不支持登录）', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: '123456' });
    expect(res.status).toBe(403);
  });

  it('/me 返回 standalone 空用户', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null, mode: 'standalone' });
  });
});

describe('网络模式认证', () => {
  let app: Awaited<typeof import('../../src/server/app')>['default'];

  beforeAll(async () => {
    process.env.DEPLOYMENT_MODE = 'network';
    vi.resetModules();
    app = (await import('../../src/server/app')).default;
    await resetDb();
  });

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(() => {
    process.env.DEPLOYMENT_MODE = 'standalone';
  });

  it('注册：字段校验、成功、邮箱冲突', async () => {
    const missing = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com' });
    expect(missing.status).toBe(400);
    expect(missing.body.error).toBe('邮箱、密码和昵称为必填');

    const short = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: '123', displayName: 'A' });
    expect(short.status).toBe(400);
    expect(short.body.error).toBe('密码至少 6 位');

    const ok = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: '123456', displayName: '家长A' });
    expect(ok.status).toBe(201);
    expect(ok.body.user).toMatchObject({ email: 'a@b.com', displayName: '家长A', role: 'parent' });
    expect(ok.body.token).toBeTruthy();

    const dup = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: '123456', displayName: 'B' });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toBe('该邮箱已注册');
  });

  it('登录：成功与失败', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: '123456', displayName: 'A' });

    const ok = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: '123456' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();

    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'wrong1' });
    expect(bad.status).toBe(401);
    expect(bad.body.error).toBe('邮箱或密码错误');

    const missing = await request(app).post('/api/auth/login').send({});
    expect(missing.status).toBe(400);
  });

  it('/me：需要 token，有效 token 返回用户', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: '123456', displayName: 'A' });

    const noToken = await request(app).get('/api/auth/me');
    expect(noToken.status).toBe(401);

    const ok = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${reg.body.token}`);
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ mode: 'network', user: { email: 'a@b.com' } });
  });

  it('受保护接口拒绝无效 token', async () => {
    const res = await request(app).get('/api/tasks').set('Authorization', 'Bearer not.a.token');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('登录已过期');
  });

  it('过期 token → 401', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ userId: 1, exp: Math.floor(Date.now() / 1000) - 3600 })
    ).toString('base64url');
    const sig = crypto
      .createHmac('sha256', 'change-me-in-production')
      .update(`${header}.${payload}`)
      .digest('base64url');
    const expired = `${header}.${payload}.${sig}`;

    const res = await request(app).get('/api/tasks').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('登录已过期');
  });
});
