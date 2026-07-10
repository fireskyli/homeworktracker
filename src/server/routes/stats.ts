import { Router } from 'express';
import { prisma, calcPointsBalance } from '../db';

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
statsRouter.get('/overview', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const [todayTasks, todayCheckins, weekCheckins, allCheckins] = await Promise.all([
      prisma.task.count({ where: { isActive: 1, userId: req.userId } }),
      prisma.checkIn.count({ where: { date: today, userId: req.userId } }),
      prisma.checkIn.findMany({ where: { date: { gte: weekAgoStr }, userId: req.userId } }),
      prisma.checkIn.findMany({ where: { userId: req.userId }, select: { date: true } }),
    ]);

    const todayRate = todayTasks > 0 ? Math.round((todayCheckins / todayTasks) * 100) : 0;

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

// 积分余额
statsRouter.get('/points-balance', async (req, res) => {
  try {
    const { totalEarned, totalSpent, balance } = await calcPointsBalance(req.userId);
    res.json({ totalEarned, totalSpent, balance });
  } catch (err) {
    res.status(500).json({ error: '查询失败' });
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
      where: { date: { gte: fromStr, lte: toStr }, userId: req.userId },
    });

    const byDate: Record<string, number> = {};
    for (const c of checkins) {
      byDate[c.date] = (byDate[c.date] || 0) + 1;
    }

    const activeTaskCount = await prisma.task.count({ where: { isActive: 1, userId: req.userId } });

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

    const where: Record<string, unknown> = { userId: req.userId };
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
      where: { date: { gte: from, lte: to }, userId: req.userId },
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

// 周报数据
statsRouter.get('/weekly', async (req, res) => {
  try {
    const now = new Date();
    const baseDate = req.query.date ? String(req.query.date) : now.toISOString().split('T')[0];
    const base = new Date(baseDate);

    const dayOfWeek = base.getDay() || 7;
    const monday = new Date(base);
    monday.setDate(base.getDate() - dayOfWeek + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const mondayStr = monday.toISOString().split('T')[0];
    const sundayStr = sunday.toISOString().split('T')[0];

    const [checkins, tasks, allCheckins, weekRedemptions, allRedemptions] = await Promise.all([
      prisma.checkIn.findMany({
        where: { date: { gte: mondayStr, lte: sundayStr }, userId: req.userId },
        include: { task: { select: { name: true, subject: true, emoji: true, points: true } } },
        orderBy: { date: 'asc' },
      }),
      prisma.task.findMany({ where: { isActive: 1, userId: req.userId } }),
      prisma.checkIn.findMany({
        where: { userId: req.userId },
        include: { task: { select: { points: true } } },
      }),
      prisma.redemption.findMany({
        where: { date: { gte: mondayStr, lte: sundayStr }, status: 'approved', userId: req.userId },
      }),
      prisma.redemption.findMany({ where: { status: 'approved', userId: req.userId } }),
    ]);

    const totalTasks = tasks.length;
    const totalCheckins = checkins.length;
    const weekTotalTasks = totalTasks * 7;
    const weekRate = weekTotalTasks > 0 ? Math.round((totalCheckins / weekTotalTasks) * 100) : 0;

    // 每日明细
    const dailyBreakdown: Record<string, { date: string; count: number; rate: number; pointsEarned: number; tasks: { name: string; subject: string; emoji: string; quality: number | null; pointsEarned: number }[] }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const s = d.toISOString().split('T')[0];
      dailyBreakdown[s] = { date: s, count: 0, rate: 0, pointsEarned: 0, tasks: [] };
    }
    const _taskPointsMap = new Map(tasks.map(t => [t.id, t.points || 0]));
    for (const c of checkins) {
      if (dailyBreakdown[c.date]) {
        dailyBreakdown[c.date].count++;
        const base = _taskPointsMap.get(c.taskId) || 0;
        const q = c.quality || 0;
        const earned = q > 0 ? Math.min(q, base) : 0;
        dailyBreakdown[c.date].pointsEarned += earned;
        dailyBreakdown[c.date].tasks.push({
          name: c.task.name,
          subject: c.task.subject,
          emoji: c.task.emoji,
          quality: c.quality,
          pointsEarned: earned,
        });
      }
    }
    for (const s of Object.keys(dailyBreakdown)) {
      const day = dailyBreakdown[s];
      day.rate = totalTasks > 0 ? Math.round((day.count / totalTasks) * 100) : 0;
    }

    // 科目分布
    const subjectDist: Record<string, number> = {};
    for (const c of checkins) {
      subjectDist[c.task.subject] = (subjectDist[c.task.subject] || 0) + 1;
    }

    // 质量分布
    const qualityDist: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    let qualityTotal = 0;
    for (const c of checkins) {
      if (c.quality) {
        qualityDist[c.quality] = (qualityDist[c.quality] || 0) + 1;
        qualityTotal++;
      }
    }
    const avgQuality = qualityTotal > 0
      ? Math.round(((qualityDist[1] * 1 + qualityDist[2] * 2 + qualityDist[3] * 3) / qualityTotal) * 10) / 10
      : 0;

    const checkinDays = new Set(checkins.map(c => c.date)).size;
    const makeupCount = checkins.filter(c => c.isMakeup === 1).length;
    const photoCount = checkins.filter(c => c.photoUrl).length;

    // 积分统计
    const taskPointsMap = new Map(tasks.map(t => [t.id, t.points || 0]));
    let totalPointsEarned = 0;
    for (const c of checkins) {
      const base = taskPointsMap.get(c.taskId) || 0;
      const q = c.quality || 0;
      totalPointsEarned += q > 0 ? Math.min(q, base) : 0;
    }

    const totalPointsSpent = weekRedemptions.reduce((s, r) => s + r.points, 0);

    // 使用开头已查的全量数据计算累计积分
    let lifetimeEarned = 0;
    for (const c of allCheckins) {
      const base = c.task?.points || 0;
      const q = c.quality || 0;
      lifetimeEarned += q > 0 ? Math.min(q, base) : 0;
    }
    const lifetimeSpent = allRedemptions.reduce((s, r) => s + r.points, 0);

    res.json({
      weekStart: mondayStr,
      weekEnd: sundayStr,
      totalTasks,
      totalCheckins,
      weekRate,
      checkinDays,
      avgQuality,
      makeupCount,
      photoCount,
      totalPointsEarned,
      totalPointsSpent,
      netPoints: totalPointsEarned - totalPointsSpent,
      balance: lifetimeEarned - lifetimeSpent,
      redemptions: weekRedemptions.map(r => ({
        id: r.id,
        name: r.name,
        points: r.points,
        date: r.date,
        photoUrl: r.photoUrl,
      })),
      dailyBreakdown: Object.values(dailyBreakdown),
      subjectDist,
      qualityDist,
    });
  } catch (err) {
    res.status(500).json({ error: '周报生成失败' });
  }
});

// 连续打卡数据
statsRouter.get('/streak', async (req, res) => {
  try {
    const checkins = await prisma.checkIn.findMany({
      where: { userId: req.userId },
      select: { date: true },
    });
    const dates = checkins.map(c => c.date);
    const streak = calcStreak(dates);
    res.json(streak);
  } catch (err) {
    res.status(500).json({ error: '查询失败' });
  }
});
