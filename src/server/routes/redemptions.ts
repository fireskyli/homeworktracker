import { Router } from 'express';
import { prisma, calcPointsBalance } from '../db';

// 验证家长密码
async function verifyParentPassword(password: string): Promise<boolean> {
  const setting = await prisma.setting.findUnique({ where: { key: 'parent_password' } });
  return setting?.value === password;
}

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
    const { totalEarned, totalSpent, balance } = await calcPointsBalance();
    res.json({ totalEarned, totalSpent, balance });
  } catch (err) {
    res.status(500).json({ error: '查询余额失败' });
  }
});

// 学生申请兑换
redemptionsRouter.post('/apply', async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ error: '商品ID必填' });
    }

    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
    });
    if (!product || product.isActive !== 1) {
      return res.status(404).json({ error: '商品不存在或已下架' });
    }

    // 检查积分余额
    const { balance } = await calcPointsBalance();
    if (balance < product.points) {
      return res.status(400).json({ error: `积分不足（当前 ${balance} 分，需要 ${product.points} 分）` });
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const redemption = await prisma.redemption.create({
      data: {
        name: product.name,
        points: product.points,
        date: today,
        photoUrl: product.photoUrl,
        status: 'pending',
        createdAt: now,
        appliedAt: now,
        productId: product.id,
      },
    });
    res.status(201).json(redemption);
  } catch (err) {
    console.error('申请兑换失败:', err);
    res.status(500).json({ error: '申请兑换失败', detail: String(err) });
  }
});

// 家长审批通过
redemptionsRouter.post('/:id/approve', async (req, res) => {
  try {
    const { password } = req.body;
    if (!await verifyParentPassword(password)) {
      return res.status(403).json({ error: '密码错误' });
    }

    const redemption = await prisma.redemption.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!redemption) {
      return res.status(404).json({ error: '兑换记录不存在' });
    }
    if (redemption.status !== 'pending') {
      return res.status(400).json({ error: `当前状态为 ${redemption.status}，无法审批` });
    }

    const updated = await prisma.redemption.update({
      where: { id: Number(req.params.id) },
      data: { status: 'approved', approvedAt: new Date().toISOString() },
    });
    res.json(updated);
  } catch (err) {
    console.error('审批通过失败:', err);
    res.status(500).json({ error: '审批失败', detail: String(err) });
  }
});

// 家长拒绝
redemptionsRouter.post('/:id/reject', async (req, res) => {
  try {
    const { password } = req.body;
    if (!await verifyParentPassword(password)) {
      return res.status(403).json({ error: '密码错误' });
    }

    const redemption = await prisma.redemption.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!redemption) {
      return res.status(404).json({ error: '兑换记录不存在' });
    }
    if (redemption.status !== 'pending') {
      return res.status(400).json({ error: `当前状态为 ${redemption.status}，无法操作` });
    }

    const updated = await prisma.redemption.update({
      where: { id: Number(req.params.id) },
      data: { status: 'rejected' },
    });
    res.json(updated);
  } catch (err) {
    console.error('拒绝失败:', err);
    res.status(500).json({ error: '操作失败', detail: String(err) });
  }
});
