import { Router } from 'express';
import { prisma } from '../db';

export const checkinRouter = Router();

// 打卡
checkinRouter.post('/', async (req, res) => {
  try {
    const { taskId, date, quality, photoUrl, note } = req.body;
    if (!taskId) return res.status(400).json({ error: 'taskId 必填' });

    const task = await prisma.task.findUnique({ where: { id: Number(taskId) } });
    if (!task || !task.isActive) return res.status(404).json({ error: '任务不存在' });

    const today = date || new Date().toISOString().split('T')[0];

    // 检查是否已打卡
    const existing = await prisma.checkIn.findUnique({
      where: { taskId_date: { taskId: Number(taskId), date: today } },
    });
    if (existing) return res.status(409).json({ error: '今日已打卡' });

    const checkin = await prisma.checkIn.create({
      data: {
        taskId: Number(taskId),
        date: today,
        completedAt: new Date().toISOString(),
        quality: quality || null,
        photoUrl: photoUrl || null,
        note: note || null,
      },
    });
    res.status(201).json(checkin);
  } catch (err) {
    res.status(500).json({ error: '打卡失败' });
  }
});

// 取消打卡
checkinRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.checkIn.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: '取消打卡失败' });
  }
});

// 按日期查询
checkinRouter.get('/date/:date', async (req, res) => {
  try {
    const checkins = await prisma.checkIn.findMany({
      where: { date: req.params.date },
      orderBy: { completedAt: 'desc' },
    });
    res.json(checkins);
  } catch (err) {
    res.status(500).json({ error: '查询失败' });
  }
});

// 日期范围查询
checkinRouter.get('/range', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const checkins = await prisma.checkIn.findMany({
      where: {
        date: {
          gte: String(startDate),
          lte: String(endDate),
        },
      },
      orderBy: { date: 'asc' },
    });
    res.json(checkins);
  } catch (err) {
    res.status(500).json({ error: '查询失败' });
  }
});
