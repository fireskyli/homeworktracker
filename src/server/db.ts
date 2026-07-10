import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

const PRESET_EXERCISES = [
  { name: '跳绳', emoji: '🪢', unit: '次', sortOrder: 0 },
  { name: '仰卧起坐', emoji: '🧘', unit: '个', sortOrder: 1 },
  { name: '坐位体前屈', emoji: '🤸', unit: '厘米', sortOrder: 2 },
  { name: '跑步', emoji: '🏃', unit: '米', sortOrder: 3 },
  { name: '游泳', emoji: '🏊', unit: '米', sortOrder: 4 },
  { name: '篮球', emoji: '🏀', unit: '分钟', sortOrder: 5 },
];

export async function initPresetExercises() {
  for (const p of PRESET_EXERCISES) {
    const exists = await prisma.exerciseType.findFirst({
      where: { name: p.name, isPreset: 1 },
    });
    if (!exists) {
      await prisma.exerciseType.create({
        data: { ...p, isPreset: 1, isActive: 1, createdAt: new Date().toISOString() },
      });
    }
  }
  console.log('[Init] 预设运动类型已就绪');
}

// 哨兵用户：单机模式所有数据关联到此用户
export async function initSentinelUser() {
  const exists = await prisma.user.findUnique({ where: { id: 0 } });
  if (!exists) {
    const now = new Date().toISOString();
    await prisma.user.create({
      data: {
        id: 0,
        email: 'standalone@local',
        passwordHash: await bcrypt.hash('__standalone__', 1),
        displayName: '本地用户',
        role: 'parent',
        createdAt: now,
        updatedAt: now,
      },
    });
    console.log('[Init] 哨兵用户已创建 (id=0)');
  }
}

/**
 * 计算积分余额（作业积分 + 运动积分 - 兑换消耗）
 * 作业积分：min(quality, task.points)，quality=0 不得分（1星=1分, 2星=2分, 3星=3分，上限为任务基础积分）
 * 运动积分：每个太阳☀️ = 1 积分
 */
export async function calcPointsBalance(userId: number): Promise<{ totalEarned: number; totalSpent: number; balance: number }> {
  const [checkins, redemptions, exercises] = await Promise.all([
    prisma.checkIn.findMany({
      where: { userId },
      include: { task: { select: { points: true } } },
    }),
    prisma.redemption.aggregate({ where: { status: 'approved', userId }, _sum: { points: true } }),
    prisma.exercise.findMany({ where: { userId }, select: { quality: true } }),
  ]);

  let totalEarned = 0;
  for (const c of checkins) {
    const base = c.task.points || 0;
    const q = c.quality || 0;
    if (q > 0) totalEarned += Math.min(q, base);
  }
  // 运动积分：每个太阳=1积分
  for (const e of exercises) {
    totalEarned += e.quality || 0;
  }

  const totalSpent = redemptions._sum.points || 0;
  return { totalEarned, totalSpent, balance: totalEarned - totalSpent };
}
