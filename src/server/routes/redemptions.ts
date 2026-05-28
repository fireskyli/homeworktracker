import { Router } from 'express';
import { prisma } from '../db';

export const redemptionsRouter = Router();

// 获取兑换记录列表
redemptionsRouter.get('/', async (req, res) => {
  try {
    const { start, end } = req.query;
    const where: Record<string, unknown> = {};
    if (start || end) {
      where.date = {};
      if (start) (where.date as Record<string, string>).gte = String(start);
      if (end) (where.date as Record<string, string>).lte = String(end);
    }
    const redemptions = await prisma.redemption.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });
    res.json(redemptions);
  } catch (err) {
    console.error('获取兑换记录失败:', err);
    res.status(500).json({ error: '获取兑换记录失败', detail: String(err) });
  }
});

// 创建兑换记录
redemptionsRouter.post('/', async (req, res) => {
  try {
    const { name, points, date, photoUrl, password } = req.body;

    if (!name || !points) {
      return res.status(400).json({ error: '兑换名称和积分必填' });
    }

    // 验证家长密码
    const setting = await prisma.setting.findUnique({ where: { key: 'parent_password' } });
    if (!setting || setting.value !== password) {
      return res.status(403).json({ error: '密码错误' });
    }

    const redemption = await prisma.redemption.create({
      data: {
        name,
        points: Number(points),
        date: date || new Date().toISOString().split('T')[0],
        photoUrl: photoUrl || null,
        createdAt: new Date().toISOString(),
      },
    });
    res.status(201).json(redemption);
  } catch (err) {
    res.status(500).json({ error: '创建兑换记录失败' });
  }
});

// 删除兑换记录
redemptionsRouter.delete('/:id', async (req, res) => {
  try {
    const { password } = req.body;

    // 验证家长密码
    const setting = await prisma.setting.findUnique({ where: { key: 'parent_password' } });
    if (!setting || setting.value !== password) {
      return res.status(403).json({ error: '密码错误' });
    }

    await prisma.redemption.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: '删除失败' });
  }
});

// 获取积分余额（累计获得 - 累计消耗）
redemptionsRouter.get('/balance', async (_req, res) => {
  try {
    // 所有打卡记录
    const checkins = await prisma.checkIn.findMany({
      include: { task: { select: { points: true } } },
    });
    let totalEarned = 0;
    for (const c of checkins) {
      const base = c.task.points || 0;
      const q = c.quality || 0;
      totalEarned += q > 0 ? Math.round(base * (q / 3)) : 0;
    }

    // 所有兑换记录
    const redemptionSum = await prisma.redemption.aggregate({
      _sum: { points: true },
    });
    const totalSpent = redemptionSum._sum.points || 0;

    res.json({
      totalEarned,
      totalSpent,
      balance: totalEarned - totalSpent,
    });
  } catch (err) {
    res.status(500).json({ error: '查询余额失败' });
  }
});
