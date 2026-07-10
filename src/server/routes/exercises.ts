import { Router } from 'express';
import { prisma } from '../db';

export const exerciseRouter = Router();

// 获取运动记录列表
exerciseRouter.get('/', async (req, res) => {
  try {
    const { startDate, endDate, typeId } = req.query;
    const where: Record<string, unknown> = { userId: req.userId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, string>).gte = String(startDate);
      if (endDate) (where.date as Record<string, string>).lte = String(endDate);
    }
    if (typeId) where.exerciseTypeId = Number(typeId);

    const exercises = await prisma.exercise.findMany({
      where,
      include: { exerciseType: true },
      orderBy: { completedAt: 'desc' },
    });

    const result = exercises.map(e => ({
      ...e,
      sets: e.sets ? JSON.parse(e.sets) : null,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: '查询失败' });
  }
});

// 今日运动记录
exerciseRouter.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const exercises = await prisma.exercise.findMany({
      where: { date: today, userId: req.userId },
      include: { exerciseType: true },
      orderBy: { completedAt: 'desc' },
    });

    const result = exercises.map(e => ({
      ...e,
      sets: e.sets ? JSON.parse(e.sets) : null,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: '查询失败' });
  }
});

// 单条记录
exerciseRouter.get('/:id', async (req, res) => {
  try {
    const exercise = await prisma.exercise.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
      include: { exerciseType: true },
    });
    if (!exercise) return res.status(404).json({ error: '记录不存在' });
    res.json({ ...exercise, sets: exercise.sets ? JSON.parse(exercise.sets) : null });
  } catch (err) {
    res.status(500).json({ error: '查询失败' });
  }
});

// 创建运动记录
exerciseRouter.post('/', async (req, res) => {
  try {
    const { exerciseTypeId, date, quality, sets, note } = req.body;
    if (!exerciseTypeId) return res.status(400).json({ error: 'exerciseTypeId 必填' });

    const type = await prisma.exerciseType.findFirst({
      where: { id: Number(exerciseTypeId), userId: req.userId },
    });
    if (!type || !type.isActive) return res.status(404).json({ error: '运动类型不存在' });

    const today = date || new Date().toISOString().split('T')[0];
    const isMakeup = today !== new Date().toISOString().split('T')[0];
    const exercise = await prisma.exercise.create({
      data: {
        exerciseTypeId: Number(exerciseTypeId),
        date: today,
        completedAt: new Date().toISOString(),
        quality: quality || null,
        sets: sets ? JSON.stringify(sets) : null,
        note: note || null,
        isMakeup: isMakeup ? 1 : 0,
        createdAt: new Date().toISOString(),
        userId: req.userId,
      },
      include: { exerciseType: true },
    });

    res.status(201).json({ ...exercise, sets: exercise.sets ? JSON.parse(exercise.sets) : null });
  } catch (err) {
    res.status(500).json({ error: '创建失败' });
  }
});

// 删除运动记录
exerciseRouter.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.exercise.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: '记录不存在' });

    await prisma.exercise.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: '删除失败' });
  }
});
