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

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
npx prisma db push
```

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

### 方案一：Railway（推荐）

Railway 提供免费的容器部署，支持 Node.js，每月有 500 小时免费额度。

#### 步骤：

1. **注册** — 前往 [railway.app](https://railway.app)，用 GitHub 账号登录
2. **新建项目** — 点击 `New Project` → `Deploy from GitHub repo` → 选择 `homeworktracker`
3. **配置启动命令** — 在 Railway 项目设置中，设置：
   ```
   Start Command: npm run build && npm start
   ```
4. **配置环境变量** — 添加：
   ```
   NODE_ENV = production
   PORT = 3000
   DATABASE_URL = file:./prisma/homework.db
   ```
5. **部署** — Railway 会自动检测 `package.json` 并部署

> ⚠️ **注意**：Railway 的容器文件系统是只读的，SQLite 数据会在每次部署时重置。如需持久化数据，建议升级到付费版或使用外部数据库。

***

### 方案二：Render

Render 提供免费的 Web 服务，每月 750 小时免费额度。

#### 步骤：

1. **注册** — 前往 [render.com](https://render.com)，用 GitHub 账号登录
2. **创建 Web Service** — 点击 `New` → `Web Service` → 连接 `homeworktracker` 仓库
3. **配置**：
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: `Node`
4. **添加环境变量**：
   ```
   NODE_ENV = production
   ```
5. **部署** — 点击 `Create Web Service`

> ⚠️ **注意**：Render 免费版实例在 15 分钟无访问后会休眠，再次访问需要等待 30 秒左右冷启动。

***

### 方案三：Zeet

Zeet 提供免费的容器部署，配置简单。

#### 步骤：

1. **注册** — 前往 [zeet.co](https://zeet.co)，用 GitHub 账号登录
2. **创建项目** — 选择 `homeworktracker` 仓库
3. **部署** — Zeet 自动检测并部署
4. **获取域名** — Zeet 会自动分配一个 `*.zeet.app` 域名

***

### 方案四：自托管（树莓派 / 旧电脑）

如果家里有闲置的树莓派或旧电脑，可以 24 小时开机作为家庭服务器。

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
   使用 Nginx 将 80 端口代理到 3000 端口，这样访问时不需要带端口号。
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
