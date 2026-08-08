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
    prisma.task.deleteMany(),
    prisma.scheduleEntry.deleteMany(),
    prisma.user.deleteMany({ where: { id: { not: 0 } } }),
  ]);
  await initSentinelUser();
}

/** 与服务端一致的“今天”字符串（UTC） */
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
