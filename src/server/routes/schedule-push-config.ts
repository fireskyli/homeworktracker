import { Router } from 'express';
import { getPushConfig, savePushConfig, pushDailySchedule } from '../schedule-push';
import { sendDingtalkMarkdown, isValidDingtalkWebhook } from '../notifier';

export const pushConfigRouter = Router();

// 获取推送配置
pushConfigRouter.get('/', async (req, res) => {
  try {
    const config = await getPushConfig(req.userId);
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: '获取推送配置失败' });
  }
});

// 保存推送配置
pushConfigRouter.put('/', async (req, res) => {
  try {
    const { webhook, enabled } = req.body;
    const config = await savePushConfig({ webhook: webhook || '', enabled: !!enabled }, req.userId);
    res.json(config);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// 手动推送今日课表（强制推送，忽略去重）
pushConfigRouter.post('/today', async (req, res) => {
  try {
    const ok = await pushDailySchedule(req.userId);
    if (ok) return res.json({ ok: true, message: '今日课表已推送' });
    const config = await getPushConfig(req.userId);
    if (!config.enabled) return res.status(400).json({ error: '推送未开启' });
    if (!config.webhook) return res.status(400).json({ error: 'webhook 未配置' });
    return res.status(500).json({ error: '推送失败' });
  } catch (err) {
    res.status(500).json({ error: `推送失败: ${(err as Error).message}` });
  }
});

// 测试推送
pushConfigRouter.post('/test', async (req, res) => {
  try {
    const { webhook } = req.body;
    if (!isValidDingtalkWebhook(webhook)) {
      return res.status(400).json({ error: '无效的钉钉 webhook 地址' });
    }
    const result = await sendDingtalkMarkdown(webhook, '✅ 测试推送 · 励夏的课程', '#### ✅ 测试推送 · 励夏的课程\n\n课程推送配置成功！此后将在此群收到课程提醒。');
    if (result.ok) return res.json({ ok: true });
    return res.status(500).json({ error: result.error });
  } catch (err) {
    res.status(500).json({ error: '测试推送失败' });
  }
});