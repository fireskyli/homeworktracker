import { Router } from 'express';
import { prisma } from '../db';

export const taskRouter = Router();

// 获取所有活跃任务
taskRouter.get('/', async (_req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { isActive: 1 },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: '获取任务失败' });
  }
});

// 获取今日任务（含打卡状态）
taskRouter.get('/today', async (_req, res) => {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const todayStr = now.toISOString().split('T')[0];

    const tasks = await prisma.task.findMany({
      where: { isActive: 1 },
      orderBy: { sortOrder: 'asc' },
    });

    const todayCheckins = await prisma.checkIn.findMany({
      where: { date: todayStr },
    });
    const checkinMap = new Map(todayCheckins.map(c => [c.taskId, c]));

    // 获取所有打卡记录（用于判断一次性任务是否已完成过）
    const allCheckins = await prisma.checkIn.findMany({
      select: { taskId: true },
    });
    const completedTaskIds = new Set(allCheckins.map(c => c.taskId));

    const result = tasks
      .filter(task => {
        if (task.repeatType === 'daily') return true;
        if (task.repeatType === 'once') {
          // 一次性任务：startDate <= 今天 且 从未完成过打卡（未完成则顺延）
          const taskDate = task.startDate || task.createdAt.slice(0, 10);
          return taskDate <= todayStr && !completedTaskIds.has(task.id);
        }
        if (task.repeatType === 'weekly') {
          const days: number[] = JSON.parse(task.repeatDays);
          return days.includes(dayOfWeek);
        }
        return false;
      })
      .map(task => {
        const taskDate = task.repeatType === 'once'
          ? (task.startDate || task.createdAt.slice(0, 10))
          : null;
        const overdueDays = taskDate && taskDate < todayStr
          ? Math.floor((now.getTime() - new Date(taskDate).getTime()) / 86400000)
          : 0;
        return {
          ...task,
          isCheckedIn: checkinMap.has(task.id),
          checkInId: checkinMap.get(task.id)?.id ?? null,
          quality: checkinMap.get(task.id)?.quality ?? null,
          overdueDays,
        };
      });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: '获取今日任务失败' });
  }
});

// 获取单个任务
taskRouter.get('/:id', async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: Number(req.params.id) } });
    if (!task) return res.status(404).json({ error: '任务不存在' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: '获取任务失败' });
  }
});

// 创建任务
taskRouter.post('/', async (req, res) => {
  try {
    const { name, subject, emoji, estimatedMin, deadlineTime, repeatType, repeatDays, startDate } = req.body;
    if (!name || !subject) return res.status(400).json({ error: '任务名和科目必填' });

    const now = new Date().toISOString();
    const task = await prisma.task.create({
      data: {
        name,
        subject,
        emoji: emoji || '📚',
        estimatedMin: estimatedMin || 0,
        deadlineTime: deadlineTime || null,
        repeatType: repeatType || 'once',
        repeatDays: JSON.stringify(repeatDays || []),
        startDate: startDate || null,
        createdAt: now,
        updatedAt: now,
      },
    });
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: '创建任务失败' });
  }
});

// 更新任务
taskRouter.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, subject, emoji, estimatedMin, deadlineTime, repeatType, repeatDays, sortOrder, isActive, startDate } = req.body;

    const data: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (name !== undefined) data.name = name;
    if (subject !== undefined) data.subject = subject;
    if (emoji !== undefined) data.emoji = emoji;
    if (estimatedMin !== undefined) data.estimatedMin = estimatedMin;
    if (deadlineTime !== undefined) data.deadlineTime = deadlineTime;
    if (repeatType !== undefined) data.repeatType = repeatType;
    if (repeatDays !== undefined) data.repeatDays = JSON.stringify(repeatDays);
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (isActive !== undefined) data.isActive = isActive ? 1 : 0;
    if (startDate !== undefined) data.startDate = startDate;

    const task = await prisma.task.update({ where: { id }, data });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: '更新任务失败' });
  }
});

// 软删除任务
taskRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.task.update({
      where: { id: Number(req.params.id) },
      data: { isActive: 0, updatedAt: new Date().toISOString() },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: '删除任务失败' });
  }
});

// 调整排序
taskRouter.put('/:id/sort', async (req, res) => {
  try {
    const task = await prisma.task.update({
      where: { id: Number(req.params.id) },
      data: { sortOrder: req.body.sortOrder, updatedAt: new Date().toISOString() },
    });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: '排序失败' });
  }
});
