import { Router } from 'express';
import { prisma } from '../db';

export const exerciseTypeRouter = Router();

// 获取所有活跃运动类型
exerciseTypeRouter.get('/', async (req, res) => {
  try {
    const types = await prisma.exerciseType.findMany({
      where: { isActive: 1, userId: req.userId },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: '获取运动类型失败' });
  }
});

// 创建自定义运动类型
exerciseTypeRouter.post('/', async (req, res) => {
  try {
    const { name, emoji, unit, password } = req.body;
    if (!name) return res.status(400).json({ error: '运动名称必填' });

    // 验证家长密码
    const setting = await prisma.setting.findFirst({ where: { key: 'parent_password', userId: req.userId } });
    if (!setting || setting.value !== password) {
      return res.status(403).json({ error: '密码错误' });
    }

    const now = new Date().toISOString();
    const maxOrder = await prisma.exerciseType.findFirst({
      where: { userId: req.userId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const type = await prisma.exerciseType.create({
      data: {
        name,
        emoji: emoji || '🏃',
        unit: unit || '次',
        isPreset: 0,
        sortOrder: (maxOrder?.sortOrder || 0) + 1,
        createdAt: now,
        userId: req.userId,
      },
    });
    res.status(201).json(type);
  } catch (err) {
    res.status(500).json({ error: '创建运动类型失败' });
  }
});

// 更新运动类型
exerciseTypeRouter.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, emoji, unit, password } = req.body;

    // 验证家长密码
    const setting = await prisma.setting.findFirst({ where: { key: 'parent_password', userId: req.userId } });
    if (!setting || setting.value !== password) {
      return res.status(403).json({ error: '密码错误' });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (emoji !== undefined) data.emoji = emoji;
    if (unit !== undefined) data.unit = unit;

    const existing = await prisma.exerciseType.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: '运动类型不存在' });

    const type = await prisma.exerciseType.update({ where: { id }, data });
    res.json(type);
  } catch (err) {
    res.status(500).json({ error: '更新运动类型失败' });
  }
});

// 软删除运动类型
exerciseTypeRouter.delete('/:id', async (req, res) => {
  try {
    const { password } = req.body;

    // 验证家长密码
    const setting = await prisma.setting.findFirst({ where: { key: 'parent_password', userId: req.userId } });
    if (!setting || setting.value !== password) {
      return res.status(403).json({ error: '密码错误' });
    }

    const existing = await prisma.exerciseType.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!existing) return res.status(404).json({ error: '运动类型不存在' });

    await prisma.exerciseType.update({
      where: { id: Number(req.params.id) },
      data: { isActive: 0 },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: '删除运动类型失败' });
  }
});
