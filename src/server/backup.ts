import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(__dirname, '../../prisma/homework.db');
const BACKUP_DIR = path.resolve(__dirname, '../../backups');
const MAX_BACKUPS = 30; // 保留最近 30 份备份

/**
 * 创建数据库备份
 * 命名格式: homework_YYYY-MM-DD_HH-mm-ss.db
 */
export function backupDatabase(): string | null {
  try {
    if (!fs.existsSync(DB_PATH)) {
      console.warn('[Backup] 数据库文件不存在，跳过备份');
      return null;
    }

    // 确保备份目录存在
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // 生成带时间戳的文件名
    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupName = `homework_${ts}.db`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    // 复制数据库文件
    fs.copyFileSync(DB_PATH, backupPath);

    // 清理过期备份
    cleanupOldBackups();

    console.log(`[Backup] 备份成功: ${backupName}`);
    return backupPath;
  } catch (err) {
    console.error('[Backup] 备份失败:', err);
    return null;
  }
}

/**
 * 清理过期备份，只保留最近 MAX_BACKUPS 份
 */
function cleanupOldBackups(): void {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('homework_') && f.endsWith('.db'))
      .sort()
      .reverse(); // 最新的在前

    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(MAX_BACKUPS);
      for (const f of toDelete) {
        fs.unlinkSync(path.join(BACKUP_DIR, f));
        console.log(`[Backup] 清理过期备份: ${f}`);
      }
    }
  } catch (err) {
    console.error('[Backup] 清理失败:', err);
  }
}

/**
 * 获取所有备份列表
 */
export function listBackups(): { name: string; size: number; time: string }[] {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return [];
    return fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('homework_') && f.endsWith('.db'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          name: f,
          size: stat.size,
          time: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.time.localeCompare(a.time));
  } catch {
    return [];
  }
}

/**
 * 从指定备份恢复数据库
 */
export function restoreBackup(backupName: string): boolean {
  try {
    const backupPath = path.join(BACKUP_DIR, backupName);
    if (!fs.existsSync(backupPath)) {
      console.error('[Backup] 备份文件不存在:', backupName);
      return false;
    }

    // 恢复前先备份当前数据库
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safetyPath = path.join(BACKUP_DIR, `homework_before_restore_${ts}.db`);
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, safetyPath);
      console.log(`[Backup] 恢复前安全备份: ${path.basename(safetyPath)}`);
    }

    fs.copyFileSync(backupPath, DB_PATH);
    console.log(`[Backup] 恢复成功: ${backupName}`);
    return true;
  } catch (err) {
    console.error('[Backup] 恢复失败:', err);
    return false;
  }
}

/**
 * 启动定时备份（每 6 小时一次）
 */
export function startAutoBackup(): void {
  // 启动时立即备份一次
  backupDatabase();

  // 每 6 小时备份一次
  const INTERVAL = 6 * 60 * 60 * 1000;
  setInterval(() => {
    backupDatabase();
  }, INTERVAL);

  console.log('[Backup] 自动备份已启动，每 6 小时执行一次');
}
