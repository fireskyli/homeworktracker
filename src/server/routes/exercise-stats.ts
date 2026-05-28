import { Router } from 'express';
import { prisma } from '../db';

export const exerciseStatsRouter = Router();

// 计算连续运动天数
function calcExerciseStreak(dates: string[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };

  const sorted = [...new Set(dates)].sort();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

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
exerciseStatsRouter.get('/overview', async (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const [todayExercises, weekExercises, allExercises] = await Promise.all([
      prisma.exercise.findMany({ where: { date: today } }),
      prisma.exercise.findMany({ where: { date: { gte: weekAgoStr } } }),
      prisma.exercise.findMany({ select: { date: true, quality: true } }),
    ]);

    const todayCount = todayExercises.length;
    const weekCount = weekExercises.length;
    const totalSuns = allExercises.reduce((sum, e) => sum + (e.quality || 0), 0);

    const dates = allExercises.map(e => e.date);
    const streak = calcExerciseStreak(dates);

    res.json({
      todayCount,
      weekCount,
      totalSuns,
      currentStreak: streak.current,
      longestStreak: streak.longest,
      totalExercises: allExercises.length,
    });
  } catch (err) {
    res.status(500).json({ error: '统计失败' });
  }
});

// 按运动类型统计
exerciseStatsRouter.get('/by-type', async (req, res) => {
  try {
    const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? String(req.query.endDate) : undefined;

    const where: Record<string, unknown> = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, string>).gte = startDate;
      if (endDate) (where.date as Record<string, string>).lte = endDate;
    }

    const exercises = await prisma.exercise.findMany({
      where,
      include: { exerciseType: { select: { name: true, emoji: true } } },
    });

    const byType: Record<string, { name: string; emoji: string; count: number; totalSuns: number }> = {};
    for (const e of exercises) {
      const key = String(e.exerciseTypeId);
      if (!byType[key]) {
        byType[key] = { name: e.exerciseType.name, emoji: e.exerciseType.emoji, count: 0, totalSuns: 0 };
      }
      byType[key].count++;
      byType[key].totalSuns += e.quality || 0;
    }

    res.json(Object.values(byType));
  } catch (err) {
    res.status(500).json({ error: '统计失败' });
  }
});

// 月度日历数据
exerciseStatsRouter.get('/calendar', async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;

    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = `${year}-${String(month).padStart(2, '0')}-31`;

    const exercises = await prisma.exercise.findMany({
      where: { date: { gte: from, lte: to } },
    });

    const days: Record<string, number> = {};
    for (const e of exercises) {
      const day = e.date.split('-')[2];
      days[day] = (days[day] || 0) + 1;
    }

    res.json({ year, month, days });
  } catch (err) {
    res.status(500).json({ error: '统计失败' });
  }
});

// 运动趋势（近N天）
exerciseStatsRouter.get('/trend', async (req, res) => {
  try {
    const days = Number(req.query.days) || 7;
    const now = new Date();
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - days);
    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = now.toISOString().split('T')[0];

    const exercises = await prisma.exercise.findMany({
      where: { date: { gte: fromStr, lte: toStr } },
    });

    const byDate: Record<string, { count: number; suns: number }> = {};
    for (const e of exercises) {
      if (!byDate[e.date]) byDate[e.date] = { count: 0, suns: 0 };
      byDate[e.date].count++;
      byDate[e.date].suns += e.quality || 0;
    }

    const result: { date: string; count: number; suns: number }[] = [];
    const d = new Date(fromDate);
    while (d <= now) {
      const s = d.toISOString().split('T')[0];
      result.push({ date: s, ...(byDate[s] || { count: 0, suns: 0 }) });
      d.setDate(d.getDate() + 1);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: '统计失败' });
  }
});

// 历史记录（按日期倒序，含详情）
exerciseStatsRouter.get('/history', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;

    const [exercises, total] = await Promise.all([
      prisma.exercise.findMany({
        include: { exerciseType: { select: { id: true, name: true, emoji: true, unit: true } } },
        orderBy: [{ date: 'desc' }, { completedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.exercise.count(),
    ]);

    res.json({ exercises, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    res.status(500).json({ error: '获取历史记录失败' });
  }
});
