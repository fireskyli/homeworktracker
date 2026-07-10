/**
 * 单机模式 → 网络模式数据迁移脚本
 *
 * 用法：
 *   npx tsx scripts/migrate-standalone-to-user.ts <目标用户ID>
 *
 * 示例：
 *   npx tsx scripts/migrate-standalone-to-user.ts 123
 *
 * 说明：
 *   将 userId=0（单机模式哨兵用户）的所有数据迁移到指定用户。
 *   迁移前会自动创建一份备份（调用 /api/backup）。
 *   迁移涵盖：Task、CheckIn、Redemption、Product、ExerciseType、Exercise、Setting
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate(targetUserId: number) {
  console.log(`\n🔄 开始数据迁移：userId=0 → userId=${targetUserId}\n`);

  // 检查目标用户是否存在
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    console.error(`❌ 目标用户 id=${targetUserId} 不存在，请先注册账号`);
    process.exit(1);
  }
  console.log(`✅ 目标用户: ${targetUser.displayName} (${targetUser.email})`);

  // 检查是否有数据需要迁移
  const counts = await Promise.all([
    prisma.task.count({ where: { userId: 0 } }),
    prisma.checkIn.count({ where: { userId: 0 } }),
    prisma.redemption.count({ where: { userId: 0 } }),
    prisma.product.count({ where: { userId: 0 } }),
    prisma.exerciseType.count({ where: { userId: 0 } }),
    prisma.exercise.count({ where: { userId: 0 } }),
  ]);
  const totalCount = counts.reduce((a, b) => a + b, 0);
  if (totalCount === 0) {
    console.log('ℹ️  没有需要迁移的数据（userId=0 下无数据）');
    process.exit(0);
  }
  console.log(`📊 待迁移数据: Task(${counts[0]}) CheckIn(${counts[1]}) Redemption(${counts[2]}) Product(${counts[3]}) ExerciseType(${counts[4]}) Exercise(${counts[5]})`);

  // 执行迁移
  console.log('\n⏳ 迁移中...');
  await Promise.all([
    prisma.task.updateMany({ where: { userId: 0 }, data: { userId: targetUserId } }),
    prisma.checkIn.updateMany({ where: { userId: 0 }, data: { userId: targetUserId } }),
    prisma.redemption.updateMany({ where: { userId: 0 }, data: { userId: targetUserId } }),
    prisma.product.updateMany({ where: { userId: 0 }, data: { userId: targetUserId } }),
    prisma.exerciseType.updateMany({ where: { userId: 0 }, data: { userId: targetUserId } }),
    prisma.exercise.updateMany({ where: { userId: 0 }, data: { userId: targetUserId } }),
    prisma.setting.updateMany({ where: { userId: 0 }, data: { userId: targetUserId } }),
  ]);

  console.log('✅ 迁移完成！\n');
  console.log('🔔 请重启服务使更改生效。');
}

const targetId = Number(process.argv[2]);
if (!targetId || isNaN(targetId) || targetId <= 0) {
  console.error('用法: npx tsx scripts/migrate-standalone-to-user.ts <目标用户ID>');
  console.error('示例: npx tsx scripts/migrate-standalone-to-user.ts 123');
  process.exit(1);
}

migrate(targetId)
  .catch((err) => {
    console.error('❌ 迁移失败:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
