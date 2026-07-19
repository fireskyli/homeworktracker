# 📚 小学生作业打卡系统

一个帮助小学生养成作业习惯的家庭自用 Web 应用。家长设定任务，孩子一键打卡，自动统计完成率和连续打卡天数。

## 功能特性

- **任务管理** — 创建一次性 / 每日 / 每周重复任务，支持 emoji 图标
- **一键打卡** — 孩子 2 次点击内完成打卡，支持质量星级标记
- **连续打卡** — 自动计算连续天数，🔥 激励孩子保持习惯
- **统计报表** — 完成率趋势图、科目维度分析、月度日历热力图
- **家长模式** — 密码保护的任务管理界面
- **响应式** — 适配桌面、平板、手机
- **局域网访问** — 手机在同一 WiFi 下可直接访问
- **数据备份** — 自动备份（每 6 小时），支持手动备份和恢复

## 界面预览

| | |
| :---: | :---: |
| ![首页](./screen/1.png) | ![任务列表](./screen/2.png) |
| ![打卡页面](./screen/3.png) | ![统计报表](./screen/4.png) |

![家长管理](./screen/5.png)

## 技术栈

| 层次  | 技术                             |
| --- | ------------------------------ |
| 后端  | Node.js + Express + TypeScript |
| 前端  | React 18 + Vite + TailwindCSS  |
| 数据库 | SQLite + Prisma ORM            |
| 图表  | Chart.js                       |

## 环境要求

- **Node.js** ≥ 18
- **npm** ≥ 9

## 快速启动

> **默认单机模式**，零配置，开箱即用。无需设置任何环境变量。

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
npx prisma db push
```

> 首次运行或 Schema 变更后执行。已创建过数据库则自动保留数据。

### 3. 启动服务

```bash
npm run dev
```

这会同时启动：

- **后端 API** → <http://localhost:3000>
- **前端页面** → <http://localhost:5173>

浏览器打开 <http://localhost:5173> 即可使用。

### 4. 关闭服务

在终端中按 **Ctrl + C** 停止服务。

如果进程没有正常退出，手动清理：

```bash
# Windows
taskkill /F /IM node.exe

# macOS / Linux
pkill -f "node"
```

***

## 部署模式

系统支持两种部署模式，通过 `DEPLOYMENT_MODE` 环境变量切换。

> 📖 部署手册：
> - [Railway 方案](docs/deploy-network.md) — 最简单，全界面操作，$5/月
> - [Fly.io 方案](docs/deploy-network-free.md) — 完全免费 24×7，需少量命令行

| 特性 | 单机模式（默认） | 网络模式 |
|------|-----------------|----------|
| 启动方式 | `npm run dev` 直接启动 | 设置 `DEPLOYMENT_MODE=network` |
| 数据库 | SQLite 本地文件 | PostgreSQL 云端 |
| 用户系统 | 无需登录 | 注册 + 登录 + JWT |
| 数据隔离 | 单家庭 | 多家庭 userId 隔离 |
| 家长密码 | 前端简单密码 | JWT + role 权限 |
| 适用场景 | 家庭自用 / 局域网 | 多用户 SaaS |

### 网络模式快速启动

```bash
# 1. 设置环境变量
export DEPLOYMENT_MODE=network
export DATABASE_URL=postgresql://user:password@host:5432/dbname
export JWT_SECRET=your-secret-key

# 2. 安装依赖 & 初始化
npm install
npx prisma db push

# 3. 构建 & 启动
npm run build
npm start
```

### 从单机升级到网络模式

```bash
# 1. 在网络模式下注册新账号（获得 userId=123）
# 2. 运行迁移脚本
npx tsx scripts/migrate-standalone-to-user.ts 123
# 3. 重启服务
```

## 局域网手机访问

手机和电脑连接同一 WiFi 时，可以用手机访问：

### 1. 查看电脑局域网 IP

```bash
# Windows
ipconfig | findstr "IPv4"

# macOS / Linux
hostname -I
```

### 2. 启动服务（局域网模式）

修改 `vite.config.ts` 中的代理地址为你的局域网 IP：

```typescript
proxy: {
  '/api': 'http://你的IP:3000',
  '/uploads': 'http://你的IP:3000',
},
```

然后启动：

```bash
npm run dev:server   # 终端 1
npx vite --host      # 终端 2
```

### 3. 手机访问

```
http://你的IP:5173
```

***

## 部署到免费托管平台

> 托管部署推荐使用**网络模式**（`DEPLOYMENT_MODE=network`），配合 PostgreSQL 实现数据持久化。

### 方案一：Railway（推荐）

Railway 提供免费容器 + PostgreSQL，每月 500 小时免费额度。

#### 步骤：

1. **注册** — 前往 [railway.app](https://railway.app)，用 GitHub 账号登录
2. **新建项目** → `Deploy from GitHub repo` → 选择 `homeworktracker`
3. **添加 PostgreSQL** → `New` → `Database` → `PostgreSQL`
4. **配置环境变量**：
   ```
   DEPLOYMENT_MODE = network
   NODE_ENV = production
   JWT_SECRET = 生成一个随机字符串
   ```
   `DATABASE_URL` 由 Railway 自动注入，无需手动设置
5. **部署** — Railway 自动构建并部署

### 方案二：Render

Render 提供免费 Web 服务 + PostgreSQL，每月 750 小时免费额度。

#### 步骤：

1. **注册** — 前往 [render.com](https://render.com)，用 GitHub 账号登录
2. **创建 PostgreSQL** → `New` → `PostgreSQL`
3. **创建 Web Service** → 连接仓库，配置：
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. **添加环境变量**：
   ```
   DEPLOYMENT_MODE = network
   NODE_ENV = production
   JWT_SECRET = 生成一个随机字符串
   DATABASE_URL = Render PostgreSQL 的连接地址
   ```
5. **部署**

> ⚠️ Render 免费版 15 分钟无访问会休眠，唤醒需约 30 秒

### 方案三：Zeet

Zeet 提供免费容器部署。

#### 步骤：

1. **注册** — 前往 [zeet.co](https://zeet.co)，用 GitHub 登录
2. **创建项目** → 选择仓库，Zeet 自动检测
3. **配置环境变量**（同上）
4. **部署** — 自动分配 `*.zeet.app` 域名

### 方案四：Docker 自部署

```bash
docker build -t homeworktracker .
docker run -d -p 3000:3000 \
  -e DEPLOYMENT_MODE=network \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=your-secret \
  homeworktracker
```

***

### 方案五：自托管（树莓派 / 旧电脑）

单机模式，适合家庭自用。

#### 步骤：

1. **安装 Node.js**：
   ```bash
   # Ubuntu / Debian
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
2. **克隆仓库**：
   ```bash
   git clone git@github.com:fireskyli/homeworktracker.git
   cd homeworktracker
   ```
3. **安装依赖 & 构建**：
   ```bash
   npm install
   npx prisma db push
   npm run build
   ```
4. **使用 PM2 持久运行**：
   ```bash
   npm install -g pm2
   pm2 start npm --name "homeworktracker" -- start
   pm2 save
   pm2 startup
   ```
5. **配置反向代理（可选）**：
   使用 Nginx 将 80 端口代理到 3000 端口：
   ```nginx
   server {
       listen 80;
       server_name homework.local;
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
       }
   }
   ```

***

## 项目结构

```
homeworkertacker/
├── prisma/
│   ├── schema.prisma      # 数据库模型
│   └── homework.db        # SQLite 数据库
├── src/
│   ├── server/            # 后端
│   │   ├── index.ts       # 入口
│   │   ├── app.ts         # Express 配置
│   │   ├── db.ts          # Prisma 连接
│   │   ├── backup.ts      # 自动备份模块
│   │   └── routes/        # API 路由
│   └── client/            # 前端
│       ├── App.tsx        # 根组件
│       ├── components/    # 组件
│       ├── pages/         # 页面
│       ├── hooks/         # 数据 hooks
│       └── types/         # 类型定义
├── uploads/               # 作业照片存储
├── backups/               # 数据库自动备份（本地保留，不提交 Git）
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 默认账号

- **家长密码**：`1234`（首次使用后请在设置页修改）

## 数据备份

### 自动备份

服务内置自动备份机制：

- 服务启动时**立即备份一次**
- 之后**每 6 小时**自动备份
- 保留最近 **30 份**备份，过期自动清理
- 备份存储在 `backups/` 目录（本地保留，不提交 Git）

### 备份管理 API

| 接口                    | 方法   | 说明      |
| --------------------- | ---- | ------- |
| `/api/backup`         | GET  | 查看备份列表  |
| `/api/backup`         | POST | 手动触发备份  |
| `/api/backup/restore` | POST | 从指定备份恢复 |

**手动备份：**

```bash
curl -X POST http://localhost:3000/api/backup
```

**恢复数据（恢复前会自动创建安全备份）：**

```bash
curl -X POST http://localhost:3000/api/backup/restore \
  -H "Content-Type: application/json" \
  -d '{"name": "homework_2026-05-26_12-30-00.db"}'
```

### Git 远程备份

数据库文件位于 `prisma/homework.db`，已纳入 Git 管理。每次数据变更后提交即可备份到 GitHub：

```bash
git add -A
git commit -m "backup: 数据更新"
git push
```

## License

MIT
