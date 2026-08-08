# Changelog

## [0.3.0] - 2026-08-08

### 新增

- **课程表** — 月历视图管理学校课程和补习班，支持每周重复/单次课程
- **自动提醒** — 提前1天浏览器通知 + 提前30分钟站内横幅提醒
- **双模式部署** — 同一套代码支持单机（SQLite）和网络（PostgreSQL + JWT）部署
- **部署文档** — 5 种部署方案（Railway / Render / Zeet / Docker / PM2 自托管）

### 修复

- 补打卡积分未刷新（MakeupPage 缺少 refreshData 调用）
- 运动打卡页面白屏（fetchExerciseOverview 缺少 API 调用）
- 测试环境崩溃（vitest 4.1.10 + std-env@4.2.0 ESM 兼容问题）

### 测试

- 新增 19 个测试用例（课程表 CRUD 集成 + 提醒算法纯函数）
- 全量 134 个测试用例通过

### 文档

- README 更新：功能特性、技术栈、项目结构、课程表说明
- 新增 `docs/deploy-network.md`（Railway 部署手册）
- 新增 `docs/deploy-network-free.md`（Fly.io + Neon 免费部署手册）
- 新增 4 份 ADR（架构决策记录）