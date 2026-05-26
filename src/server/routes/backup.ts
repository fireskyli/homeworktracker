import { Router } from 'express';
import { backupDatabase, listBackups, restoreBackup } from '../backup';

export const backupRouter = Router();

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
