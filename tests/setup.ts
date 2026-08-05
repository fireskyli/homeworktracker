import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

// 每个测试文件一个独立临时 SQLite 库，避免并行执行时互相干扰
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'homework-test-'));
const dbFile = path.join(testDir, 'test.db');
fs.writeFileSync(dbFile, '');
process.env.DATABASE_URL = 'file:' + dbFile.replace(/\\/g, '/');

// 用 Prisma CLI 按 schema 创建表结构（进程内已有 DATABASE_URL 优先于 .env）
const prismaCli = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');
execSync(`"${process.execPath}" "${prismaCli}" db push --skip-generate --force-reset`, {
  cwd: process.cwd(),
  env: { ...process.env, CHECKPOINT_DISABLE: '1' },
  stdio: 'pipe',
});
