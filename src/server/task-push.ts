// ── 学习任务推送 ──────────────────────────────
// 向钉钉群推送今日学习任务 + 每日/每周完成总结。
// 复用课程推送的 webhook / enabled 配置与熔断保护。
// 注意：不含课程表（课程表由 schedule-push.ts 专门覆盖）。

import { prisma } from './db';
import { STANDALONE_USER_ID } from './config';
import {
  sendDingtalkMarkdown,
  buildTodayTaskMarkdown,
  buildDailySummaryMarkdown,
  buildWeeklySummaryMarkdown,
} from './notifier';
import { getPushConfig, getSetting, setSetting } from './schedule-push';

// Setting keys（task 前缀，与课程 dingtalk: 前缀区分）
const KEY_LAST_DAILY_TASK = 'task:lastDailyTask';   // 上次推送今日任务的日期 YYYY-MM-DD
const KEY_LAST_DAILY_SUMMARY = 'task:lastDailySummary'; // 上次推送今日总结的日期 YYYY-MM-DD
const KEY_LAST_WEEKLY_SUMMARY = 'task:lastWeeklySummary'; // 上次推送周总结的周期标识

export type TodayTaskItem = {
  id: number;
  name: string;
  subject: string;
  emoji: string;
  estimatedMin: number;
};

export type SummaryItem = {
  name: string;
  subject: string;
  emoji: string;
  quality: number | null;
  pointsEarned: number;
};

/**
 * 计算某用户「今天」应显示的学习任务清单（复用 tasks /today 的筛选口径）。
 * 返回结构化的今日任务列表。
 */
export async function getTodayTasks(userId: number, dateStr?: string): Promise<TodayTaskItem[]> {
  const now = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const dayOfWeek = now.getDay();
  const todayStr = dateStr || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const tasks = await prisma.task.findMany({
    where: { isActive: 1, userId },
    orderBy: { sortOrder: 'asc' },
  });

  const allCheckins = await prisma.checkIn.findMany({
    where: { userId },
    select: { taskId: true, date: true },
  });
  const completedBeforeToday = new Set(
    allCheckins.filter(c => c.date < todayStr).map(c => c.taskId)
  );

  return tasks
    .filter(task => {
      if (task.repeatType === 'daily') return true;
      if (task.repeatType === 'once') {
        const taskDate = task.startDate || task.createdAt.slice(0, 10);
        return taskDate <= todayStr && !completedBeforeToday.has(task.id);
      }
      if (task.repeatType === 'weekly') {
        const days: number[] = JSON.parse(task.repeatDays);
        return days.includes(dayOfWeek);
      }
      return false;
    })
    .map(task => ({
      id: task.id,
      name: task.name,
      subject: task.subject,
      emoji: task.emoji,
      estimatedMin: task.estimatedMin,
    }));
}

/**
 * 计算某用户某天的任务完成总结（复用 stats /weekly 的积分口径）。
 */
export async function getDailyStats(date: string, userId: number): Promise<{
  date: string;
  total: number;
  done: number;
  rate: number;
  pointsEarned: number;
  items: SummaryItem[];
}> {
  // 「今日应做任务」与今日任务推送同口径（复用 getTodayTasks 的重复规则筛选，按 date 驱动）
  const todayTasks = await getTodayTasks(userId, date);
  const todayTaskIds = new Set(todayTasks.map(t => t.id));

  const tasks = await prisma.task.findMany({
    where: { isActive: 1, userId, id: { in: Array.from(todayTaskIds) } },
  });
  const checkins = await prisma.checkIn.findMany({
    where: { date, userId },
    include: { task: { select: { name: true, subject: true, emoji: true, points: true } } },
  });

  const taskPoints = new Map(tasks.map(t => [t.id, t.points || 0]));
  let pointsEarned = 0;
  const items: SummaryItem[] = [];
  for (const c of checkins) {
    if (!todayTaskIds.has(c.taskId)) continue; // 只统计今日应做任务
    const base = taskPoints.get(c.taskId) ?? c.task?.points ?? 0;
    const q = c.quality || 0;
    const earned = q > 0 ? Math.min(q, base) : 0;
    pointsEarned += earned;
    items.push({
      name: c.task.name,
      subject: c.task.subject,
      emoji: c.task.emoji,
      quality: c.quality,
      pointsEarned: earned,
    });
  }

  const doneCount = items.length;
  const rate = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;
  return { date, total: tasks.length, done: doneCount, rate, pointsEarned, items };
}

/**
 * 计算某用户某自然周（周一~周日）的任务完成总结。
 * weekStart 为该周周一 YYYY-MM-DD。
 */
export async function getWeeklyStats(
  weekStart: string,
  userId: number
): Promise<{
  weekStart: string;
  weekEnd: string;
  total: number;
  done: number;
  rate: number;
  checkinDays: number;
  pointsEarned: number;
  subjectDist: Record<string, number>;
}> {
  const monday = new Date(weekStart + 'T00:00:00');
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekEnd = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

  const [checkins, tasks] = await Promise.all([
    prisma.checkIn.findMany({
      where: { date: { gte: weekStart, lte: weekEnd }, userId },
      include: { task: { select: { subject: true, points: true } } },
    }),
    prisma.task.findMany({ where: { isActive: 1, userId } }),
  ]);

  const taskPoints = new Map(tasks.map(t => [t.id, t.points || 0]));
  let pointsEarned = 0;
  const subjectDist: Record<string, number> = {};
  for (const c of checkins) {
    const base = taskPoints.get(c.taskId) ?? c.task?.points ?? 0;
    const q = c.quality || 0;
    pointsEarned += q > 0 ? Math.min(q, base) : 0;
    subjectDist[c.task.subject] = (subjectDist[c.task.subject] || 0) + 1;
  }

  const weekTotalTasks = tasks.length * 7;
  const rate = weekTotalTasks > 0 ? Math.round((checkins.length / weekTotalTasks) * 100) : 0;
  const checkinDays = new Set(checkins.map(c => c.date)).size;

  return {
    weekStart,
    weekEnd,
    total: tasks.length,
    done: checkins.length,
    rate,
    checkinDays,
    pointsEarned,
    subjectDist,
  };
}

/** 推送今日学习任务。返回是否推送成功。 */
export async function pushTodayTasks(userId = STANDALONE_USER_ID): Promise<boolean> {
  const config = await getPushConfig(userId);
  if (!config.enabled || !config.webhook) return false;

  const items = await getTodayTasks(userId);
  const md = buildTodayTaskMarkdown(items);
  const res = await sendDingtalkMarkdown(config.webhook, '📋 今日学习任务', md);
  if (res.ok) {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    await setSetting(KEY_LAST_DAILY_TASK, todayStr, userId);
  }
  return res.ok;
}

/** 推送今日任务完成总结。返回是否推送成功。 */
export async function pushDailySummary(userId = STANDALONE_USER_ID): Promise<boolean> {
  const config = await getPushConfig(userId);
  if (!config.enabled || !config.webhook) return false;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const stats = await getDailyStats(todayStr, userId);
  const md = buildDailySummaryMarkdown(stats);
  const res = await sendDingtalkMarkdown(config.webhook, '✅ 今日任务总结', md);
  if (res.ok) {
    await setSetting(KEY_LAST_DAILY_SUMMARY, todayStr, userId);
  }
  return res.ok;
}

/** 推送本周任务完成总结（自然周）。返回是否推送成功。 */
export async function pushWeeklySummary(userId = STANDALONE_USER_ID): Promise<boolean> {
  const config = await getPushConfig(userId);
  if (!config.enabled || !config.webhook) return false;

  const now = new Date();
  const dayOfWeek = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1);
  const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

  const stats = await getWeeklyStats(weekStart, userId);
  const md = buildWeeklySummaryMarkdown(stats);
  const res = await sendDingtalkMarkdown(config.webhook, '📊 本周任务总结', md);
  if (res.ok) {
    await setSetting(KEY_LAST_WEEKLY_SUMMARY, weekStart, userId);
  }
  return res.ok;
}

/** 判断今日任务是否已推送过（供开机补发判断） */
export async function hasTodayTaskPushed(userId: number): Promise<boolean> {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const last = await getSetting(KEY_LAST_DAILY_TASK, userId);
  return last === todayStr;
}

/** 判断今日总结是否已推送过 */
export async function hasDailySummaryPushed(userId: number): Promise<boolean> {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const last = await getSetting(KEY_LAST_DAILY_SUMMARY, userId);
  return last === todayStr;
}

/** 判断本周总结是否已推送过（按周起始标识） */
export async function hasWeeklySummaryPushed(userId: number): Promise<boolean> {
  const now = new Date();
  const dayOfWeek = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1);
  const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  const last = await getSetting(KEY_LAST_WEEKLY_SUMMARY, userId);
  return last === weekStart;
}