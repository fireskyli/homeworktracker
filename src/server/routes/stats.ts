import { Router } from 'express';
import { prisma } from '../db';

export const statsRouter = Router();

// 计算连续天数
function calcStreak(dates: string[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };

  const sorted = [...new Set(dates)].sort();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // 当前连续：从今天或昨天往前数
  let current = 0;
  let checkStr = sorted.includes(todayStr) ? todayStr : yesterdayStr;
  const checkDate = new Date(checkStr);

  while (true) {
    const s = checkDate.toISOString().split('T')[0];
    if (sorted.includes(s)) {
      current++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // 历史最长
  let longest = 1;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      streak++;
      longest = Math.max(longest, streak);
    } else {
      streak = 1;
    }
  }

  return { current, longest: Math.max(longest, current) };
}

// 概览统计
statsRouter.get('/overview', async (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const [todayTasks, todayCheckins, weekCheckins, allCheckins] = await Promise.all([
      prisma.task.count({ where: { isActive: 1 } }),
      prisma.checkIn.count({ where: { date: today } }),
      prisma.checkIn.findMany({ where: { date: { gte: weekAgoStr } } }),
      prisma.checkIn.findMany({ select: { date: true } }),
    ]);

    const todayRate = todayTasks > 0 ? Math.round((todayCheckins / todayTasks) * 100) : 0;

    // 本周每天任务数（简化：用活跃任务数 * 7 作分母）
    const weekDays = 7;
    const weekTotalTasks = todayTasks * weekDays;
    const weekRate = weekTotalTasks > 0 ? Math.round((weekCheckins.length / weekTotalTasks) * 100) : 0;

    const dates = allCheckins.map(c => c.date);
    const streak = calcStreak(dates);

    res.json({
      todayRate,
      weekRate,
      currentStreak: streak.current,
      longestStreak: streak.longest,
      totalCheckins: allCheckins.length,
    });
  } catch (err) {
    res.status(500).json({ error: '统计失败' });
  }
});

// 完成率趋势
statsRouter.get('/completion-rate', async (req, res) => {
  try {
    const period = String(req.query.period || 'week');
    const startDate = String(req.query.startDate || '');

    const now = new Date();
    let fromDate: Date;
    if (startDate) {
      fromDate = new Date(startDate);
    } else if (period === 'month') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - 7);
    }

    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = now.toISOString().split('T')[0];

    const checkins = await prisma.checkIn.findMany({
      where: { date: { gte: fromStr, lte: toStr } },
    });

    // 按日期分组
    const byDate: Record<string, number> = {};
    for (const c of checkins) {
      byDate[c.date] = (byDate[c.date] || 0) + 1;
    }

    const activeTaskCount = await prisma.task.count({ where: { isActive: 1 } });

    // 生成日期序列
    const result: { date: string; rate: number }[] = [];
    const d = new Date(fromDate);
    while (d <= now) {
      const s = d.toISOString().split('T')[0];
      const count = byDate[s] || 0;
      result.push({
        date: s,
        rate: activeTaskCount > 0 ? Math.round((count / activeTaskCount) * 100) : 0,
      });
      d.setDate(d.getDate() + 1);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: '查询失败' });
  }
});

// 科目维度统计
statsRouter.get('/subject', async (req, res) => {
  try {
    const startDate = String(req.query.startDate || '');
    const endDate = String(req.query.endDate || '');

    const where: Record<string, unknown> = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, string>).gte = startDate;
      if (endDate) (where.date as Record<string, string>).lte = endDate;
    }

    const checkins = await prisma.checkIn.findMany({
      where,
      include: { task: { select: { subject: true } } },
    });

    const bySubject: Record<string, number> = {};
    for (const c of checkins) {
      bySubject[c.task.subject] = (bySubject[c.task.subject] || 0) + 1;
    }

    res.json(bySubject);
  } catch (err) {
    res.status(500).json({ error: '查询失败' });
  }
});

// 日历数据
statsRouter.get('/calendar', async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;

    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = `${year}-${String(month).padStart(2, '0')}-31`;

    const checkins = await prisma.checkIn.findMany({
      where: { date: { gte: from, lte: to } },
    });

    const days: Record<string, number> = {};
    for (const c of checkins) {
      const day = c.date.split('-')[2];
      days[day] = (days[day] || 0) + 1;
    }

    res.json({ year, month, days });
  } catch (err) {
    res.status(500).json({ error: '查询失败' });
  }
});

// 连续打卡数据
statsRouter.get('/streak', async (_req, res) => {
  try {
    const checkins = await prisma.checkIn.findMany({ select: { date: true } });
    const dates = checkins.map(c => c.date);
    const streak = calcStreak(dates);
    res.json(streak);
  } catch (err) {
    res.status(500).json({ error: '查询失败' });
  }
});
