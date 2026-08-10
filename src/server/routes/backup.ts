import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { backupDatabase, listBackups, restoreBackup, BACKUP_DIR } from '../backup';

export const backupRouter = Router();

// multer config for backup import
// 注意：必须与 backup.ts 的 BACKUP_DIR（process.cwd()/backups）保持一致，
// 不能用 __dirname 相对路径 —— 开发(tsx)与编译(dist)模式下解析结果不同，会导致导入后恢复失败
const importTmpDir = path.join(BACKUP_DIR, 'import_tmp');
if (!fs.existsSync(importTmpDir)) {
  fs.mkdirSync(importTmpDir, { recursive: true });
}
const upload = multer({
  dest: importTmpDir,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.db')) {
      cb(null, true);
    } else {
      cb(new Error('只接受 .db 文件'));
    }
  },
});

// 获取备份列表
backupRouter.get('/', (_req, res) => {
  try {
    const backups = listBackups();
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: '获取备份列表失败' });
  }
});

// 手动触发备份
backupRouter.post('/', (_req, res) => {
  try {
    const path = backupDatabase();
    if (path) {
      res.json({ ok: true, path });
    } else {
      res.status(500).json({ error: '备份失败' });
    }
  } catch (err) {
    res.status(500).json({ error: '备份失败' });
  }
});

// 从指定备份恢复
backupRouter.post('/restore', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '请指定备份文件名' });

  const ok = restoreBackup(name);
  if (ok) {
    res.json({ ok: true });
  } else {
    res.status(500).json({ error: '恢复失败' });
  }
});

// 导入外部备份文件
backupRouter.post('/import', upload.single('backup'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请选择备份文件' });

    const tmpPath = req.file.path;

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const targetName = `homework_imported_${ts}.db`;
    const targetPath = path.join(BACKUP_DIR, targetName);

    // 先备份当前数据库
    const DB_PATH = path.resolve(process.cwd(), 'prisma', 'prisma', 'homework.db');
    const safetyName = `homework_before_import_${ts}.db`;
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, safetyName));
    }

    // 复制导入的文件到备份目录
    fs.copyFileSync(tmpPath, targetPath);

    // 清理临时文件
    fs.unlinkSync(tmpPath);

    // 自动从导入的备份恢复
    const ok = restoreBackup(targetName);
    if (ok) {
      res.json({ ok: true, name: targetName });
    } else {
      res.status(500).json({ error: '导入后恢复失败，已保留安全备份' });
    }
  } catch (err) {
    res.status(500).json({ error: '导入失败' });
  }
});
