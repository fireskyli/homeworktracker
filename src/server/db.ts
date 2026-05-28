import { PrismaClient } from '@prisma/client';

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
