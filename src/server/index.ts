import app from './app';
import { startAutoBackup } from './backup';
import { initPresetExercises, initSentinelUser } from './db';
import { startSchedulePush } from './schedule-push';

const PORT = Number(process.env.PORT) || 3000;

async function main() {
  // 先初始化哨兵用户和预设数据，再启动服务，确保请求到达时数据就绪
  await initSentinelUser();
  await initPresetExercises();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    startAutoBackup();
    startSchedulePush();
  });
}

main().catch(err => {
  console.error('启动失败:', err);
  process.exit(1);
});
