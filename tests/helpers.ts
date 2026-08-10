import { prisma, initSentinelUser } from '../src/server/db';

/**
 * 清空业务数据并确保哨兵用户（id=0）存在。
 * 按外键依赖顺序删除，避免 SQLite 外键约束报错。
 */
export async function resetDb(): Promise<void> {
  await prisma.$transaction([
    prisma.checkIn.deleteMany(),
    prisma.exercise.deleteMany(),
    prisma.redemption.deleteMany(),
    prisma.product.deleteMany(),
    prisma.exerciseType.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.scheduleAttendance.deleteMany(),
    prisma.scheduleEntry.deleteMany(),
    prisma.task.deleteMany(),
    prisma.user.deleteMany({ where: { id: { not: 0 } } }),
  ]);
  await initSentinelUser();
}

/** 与服务端一致的"今天"字符串（UTC） */
export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

/**
 * 返回本周一（自然周起始），与服务端周报口径一致。
 * 服务端统计用 new Date(todayStr()) 按 UTC 解析基准日，再 setDate 计算周界，
 * 最后 toISOString 输出。这里复用同一套逻辑，保证测试造数落在服务端认定的周内。
 */
export function thisWeekMonday(): string {
  // 复刻服务端 stats.ts 的周报边界算法：
  //   base = new Date(baseDate)  // 纯日期字符串按 UTC 解析
  //   dow = base.getDay() || 7   // getDay 用本地时区
  //   monday.setDate(base.getDate() - dow + 1)
  //   输出 monday.toISOString()
  const baseDate = todayStr();
  const base = new Date(baseDate);
  const dow = base.getDay() || 7; // 周日=0 → 7
  const monday = new Date(base);
  monday.setDate(base.getDate() - dow + 1);
  return monday.toISOString().split('T')[0];
}

/**
 * 返回本周第 n 天（1=周一 ... 7=周日）的日期字符串，与服务端周报口径一致。
 * 用于构造周报内两个不同的日期，保证测试对运行日不敏感。
 */
export function thisWeekDay(n: number): string {
  // 与服务端 dailyBreakdown 一致：从 monday 的 Date 对象按天数递增
  const monday = new Date(thisWeekMonday());
  monday.setDate(monday.getDate() + (n - 1));
  return monday.toISOString().split('T')[0];
}
