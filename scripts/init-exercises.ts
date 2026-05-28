import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRESET_EXERCISES = [
  { name: '跳绳', emoji: '🪢', unit: '次', sortOrder: 0 },
  { name: '仰卧起坐', emoji: '🧘', unit: '个', sortOrder: 1 },
  { name: '坐位体前屈', emoji: '🤸', unit: '厘米', sortOrder: 2 },
  { name: '跑步', emoji: '🏃', unit: '米', sortOrder: 3 },
  { name: '游泳', emoji: '🏊', unit: '米', sortOrder: 4 },
  { name: '篮球', emoji: '🏀', unit: '分钟', sortOrder: 5 },
];

async function main() {
  const count = await prisma.exerciseType.count({ where: { isPreset: 1 } });
  if (count === 0) {
    const now = new Date().toISOString();
    for (const p of PRESET_EXERCISES) {
      await prisma.exerciseType.create({
        data: { ...p, isPreset: 1, isActive: 1, createdAt: now },
      });
    }
    console.log(`已插入 ${PRESET_EXERCISES.length} 种预设运动类型`);
  } else {
    console.log(`已有 ${count} 种预设运动类型，跳过初始化`);
  }
}

main().finally(() => prisma.$disconnect());
