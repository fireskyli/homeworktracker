import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

// 用内存 Map 模拟文件系统，避免测试写真实的 backups/ 与数据库目录
const { mem, DB_PATH, BACKUP_DIR, SEP } = vi.hoisted(() => {
  const SEP = process.platform === 'win32' ? '\\' : '/';
  const cwd = process.cwd();
  return {
    mem: new Map<string, Buffer>(),
    DB_PATH: `${cwd}${SEP}prisma${SEP}prisma${SEP}homework.db`,
    BACKUP_DIR: `${cwd}${SEP}backups`,
    SEP,
  };
});

vi.mock('fs', () => {
  const api = {
    existsSync: (p: string) => mem.has(p),
    mkdirSync: (dir: string) => {
      mem.set(String(dir), Buffer.alloc(0));
    },
    copyFileSync: (src: string, dest: string) => {
      mem.set(dest, mem.get(src) ?? Buffer.alloc(0));
    },
    readdirSync: (dir: string) =>
      [...mem.keys()]
        .filter((k) => k.startsWith(String(dir)))
        .map((k) => k.split(SEP).pop() as string),
    unlinkSync: (p: string) => {
      mem.delete(p);
    },
    statSync: (p: string) => ({
      size: mem.get(p)?.length ?? 0,
      mtime: new Date('2026-01-01T00:00:00Z'),
    }),
  };
  return { default: api, ...api };
});

import { backupDatabase, listBackups, restoreBackup, startAutoBackup } from '../../src/server/backup';

describe('backup 模块', () => {
  beforeEach(() => {
    mem.clear();
  });

  it('数据库文件不存在时跳过备份并返回 null', () => {
    expect(backupDatabase()).toBeNull();
    expect(listBackups()).toEqual([]);
  });

  it('备份成功：复制数据库并返回备份路径', () => {
    mem.set(DB_PATH, Buffer.from('db-content'));

    const result = backupDatabase();
    expect(result).toBeTruthy();
    expect(result!.startsWith(BACKUP_DIR)).toBe(true);
    expect(result!.endsWith('.db')).toBe(true);

    const backups = listBackups();
    expect(backups).toHaveLength(1);
    expect(backups[0]).toMatchObject({
      name: path.basename(result!),
      size: Buffer.from('db-content').length,
    });
  });

  it('清理过期备份：只保留最近 30 份', () => {
    mem.set(DB_PATH, Buffer.from('db-content'));
    // 预置 35 份旧备份
    for (let i = 0; i < 35; i++) {
      const day = String((i % 28) + 1).padStart(2, '0');
      const hour = String(Math.floor(i / 28)).padStart(2, '0');
      mem.set(path.join(BACKUP_DIR, `homework_2026-01-${day}_${hour}-00-00.db`), Buffer.alloc(0));
    }

    backupDatabase();
    expect(listBackups().length).toBe(30);
  });

  it('restoreBackup：备份文件不存在返回 false', () => {
    expect(restoreBackup('nope.db')).toBe(false);
  });

  it('restoreBackup：成功恢复并先做安全备份', () => {
    mem.set(DB_PATH, Buffer.from('current-data'));
    const backupName = 'homework_2026-01-01_00-00-00.db';
    mem.set(path.join(BACKUP_DIR, backupName), Buffer.from('backup-data'));

    expect(restoreBackup(backupName)).toBe(true);
    expect(mem.get(DB_PATH)?.toString()).toBe('backup-data');

    // 恢复前应生成 homework_before_restore_* 安全备份
    const safety = [...mem.keys()].find((k) => k.includes('homework_before_restore_'));
    expect(safety).toBeTruthy();
  });

  it('startAutoBackup：启动即备份并按 6 小时间隔备份', () => {
    vi.useFakeTimers();
    mem.set(DB_PATH, Buffer.from('db-content'));

    startAutoBackup();
    expect(listBackups()).toHaveLength(1);

    vi.advanceTimersByTime(6 * 60 * 60 * 1000);
    expect(listBackups()).toHaveLength(2);

    vi.clearAllTimers();
    vi.useRealTimers();
  });
});
