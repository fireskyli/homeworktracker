/**
 * 版本常量 — 从 package.json 自动读取，单一数据源，永不同步
 *
 * 发布新版本时：
 * 1. 修改 package.json 的 version 字段
 * 2. 创建 Git tag: npm version patch|minor|major
 * 3. 创建 GitHub Release
 */

import pkg from '../../package.json';

// 当前版本（自动从 package.json 读取）
export const VERSION: string = pkg.version;

// GitHub 仓库信息
export const GITHUB_REPO = 'https://github.com/fireskyli/homeworktracker';
export const GITHUB_RELEASES = `${GITHUB_REPO}/releases`;

// 格式化版本号（如 "小学生作业打卡系统 v0.3"）
export function formatVersion(): string {
  return `小学生作业打卡系统 v${VERSION}`;
}
