# Homework Tracker — 项目指南

## 项目概述

小学生作业打卡系统。家长和孩子可以管理每日任务、打卡、积分兑换、运动记录、课程表出勤等。

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS + React Router v7
- **后端**: Express + TypeScript (tsx)
- **数据库**: SQLite + Prisma ORM
- **图表**: Chart.js + react-chartjs-2
- **测试**: Vitest + Supertest

## 项目结构

```
├── prisma/                 # 数据库 schema 和客户端
│   ├── schema.prisma       # 数据模型定义
│   └── homework.db         # SQLite 数据库文件
├── src/
│   ├── client/             # 前端代码
│   │   ├── components/     # React 组件
│   │   ├── hooks/          # 自定义 hooks（API 调用封装）
│   │   ├── pages/          # 页面组件
│   │   ├── types/          # TypeScript 类型定义
│   │   ├── utils/          # 工具函数
│   │   ├── App.tsx         # 根组件 + 路由
│   │   └── main.tsx        # 入口文件
│   └── server/             # 后端代码
│       ├── routes/         # API 路由
│       ├── middleware/     # 中间件（认证）
│       ├── db.ts           # Prisma 客户端 + 初始化
│       ├── app.ts          # Express 应用配置
│       └── index.ts        # 服务器入口
├── tests/                  # 测试文件
│   ├── helpers.ts          # 测试辅助函数
│   └── server/             # 后端 API 测试
└── uploads/                # 上传的图片文件
```

## 数据模型

- **User** — 用户（支持单机哨兵用户 id=0 和网络多用户）
- **Task** — 作业任务（支持重复规则）
- **CheckIn** — 打卡记录
- **Redemption** — 积分兑换
- **Product** — 兑换商品
- **ExerciseType** — 运动类型
- **Exercise** — 运动记录
- **ScheduleEntry** — 课程表课程
- **ScheduleAttendance** — 课程出勤记录
- **Setting** — 键值设置

## 常用命令

```bash
# 开发（同时启动前后端）
npm run dev

# 仅后端
npm run dev:server

# 仅前端
npm run dev:client

# 构建
npm run build

# 同步数据库 schema（新增模型后必须执行）
npx prisma db push

# 运行测试
npm test

# 测试覆盖率
npm run test:coverage
```

## 沙箱环境注意事项

沙箱内 Node.js 不在 PATH 中，使用 Codex 内嵌的 Node：

```powershell
$node = "C:\Users\xia\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
& $node <script> <args>
```

例如：
```powershell
& $node "D:\code\cc\homeworkertacker\node_modules\prisma\build\index.js" db push
& $node "D:\code\cc\homeworkertacker\node_modules\vitest\vitest.mjs" run
```

## 编码约定

- 日期格式：`YYYY-MM-DD`（字符串存储）
- 时间格式：`HH:mm`（字符串存储）
- 时间戳：ISO8601 字符串（不用 Date 对象存储）
- 软删除：`isActive` 字段（1=活跃, 0=已删除），不做物理删除
- 用户隔离：所有查询带 `userId` 过滤，单机模式 `userId=0`
- API 响应：成功返回 JSON 对象，失败返回 `{ error: '消息' }`
- 组件样式：使用 Tailwind CSS，不用 CSS 文件
- 错误处理：API 路由用 try/catch，前端 hooks 抛出异常由调用方处理
- 命名：组件 PascalCase，hooks 用 `use` 前缀，API 路由 RESTful

## 出勤状态值

- `attended` — 正常出勤
- `makeup` — 补上（后来补签）
- `absent` — 缺席

过去日期无显式记录 → 自动视为缺席（不写入数据库，动态计算）。
未来日期不参与统计，不可手动标记。

## 语言偏好

- 所有用户-facing 文本使用中文
- 代码注释使用中文或英文均可
- 提交信息使用中文
