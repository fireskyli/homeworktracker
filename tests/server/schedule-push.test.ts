import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/server/app';
import { resetDb } from '../helpers';
import { getPushConfig, savePushConfig } from '../../src/server/schedule-push';

describe('课程推送', () => {
  beforeAll(resetDb);
  beforeEach(resetDb);

  it('推送配置：默认未开启且无 webhook', async () => {
    const config = await getPushConfig(0);
    expect(config.enabled).toBe(false);
    expect(config.webhook).toBe('');
  });

  it('推送配置：保存开启需有效 webhook', async () => {
    await expect(savePushConfig({ webhook: 'bad-url', enabled: true }, 0)).rejects.toThrow();
  });

  it('推送配置：保存有效配置', async () => {
    const saved = await savePushConfig(
      { webhook: 'https://oapi.dingtalk.com/robot/send?access_token=test123', enabled: true },
      0
    );
    expect(saved.enabled).toBe(true);
    expect(saved.webhook).toContain('test123');
    const loaded = await getPushConfig(0);
    expect(loaded.enabled).toBe(true);
  });

  it('推送配置 API：GET/PUT', async () => {
    const put = await request(app)
      .put('/api/schedule-push-config')
      .send({ webhook: 'https://oapi.dingtalk.com/robot/send?access_token=api1', enabled: true });
    expect(put.status).toBe(200);
    expect(put.body.enabled).toBe(true);

    const get = await request(app).get('/api/schedule-push-config');
    expect(get.status).toBe(200);
    expect(get.body.webhook).toContain('api1');
  });

  it('推送配置 API：无效 webhook 开启返回 400', async () => {
    const res = await request(app)
      .put('/api/schedule-push-config')
      .send({ webhook: 'bad', enabled: true });
    expect(res.status).toBe(400);
  });

  it('测试推送 API：无效 webhook 返回 400', async () => {
    const res = await request(app)
      .post('/api/schedule-push-config/test')
      .send({ webhook: 'bad' });
    expect(res.status).toBe(400);
  });
});