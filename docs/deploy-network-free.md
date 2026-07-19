# 作业打卡系统 — 免费网络版部署手册（Fly.io + Neon）

> **写给零技术背景的家长**，跟着每一步操作即可。完全免费，7×24 小时运行。
> 预计耗时：**40 分钟**。大部分在浏览器中完成，只有一步需要复制粘贴几行命令。

---

## 你需要准备

| 准备项 | 说明 |
|--------|------|
| 一个 GitHub 账号 | 用来存放代码。如果没有，先去 [github.com](https://github.com) 注册 |
| 一个邮箱 | 注册各个平台用 |
| 浏览器 | Chrome / Edge / Safari 都可以 |
| 电脑 | Windows / Mac 都可以 |

---

## 第 1 步：把代码复制到你的 GitHub

### 1.1 登录 GitHub

打开 [github.com](https://github.com)，登录你的账号。

### 1.2 Fork（复制）仓库

打开 https://github.com/fireskyli/homeworktracker，点击右上角的 **Fork** 按钮 → **Create fork**。

```
┌─────────────────────────────────────────────┐
│  fireskyli / homeworktracker          ⭐  Fork │
│                                         ▲     │
│                                    点这里     │
└─────────────────────────────────────────────┘
```

几秒后，你的账号下就有了 `你的用户名/homeworktracker` 仓库。

---

## 第 2 步：注册 Neon（免费 PostgreSQL 数据库）

### 2.1 打开 Neon

打开 [neon.tech](https://neon.tech)，点击 **Sign Up**。

### 2.2 用 GitHub 登录

选择 **Continue with GitHub**，授权后进入控制台。

### 2.3 创建数据库

首次登录会引导你创建项目。按提示操作：

1. **Project name**：输入 `homeworktracker`（任意名字）
2. **Region**：保持默认（自动选择离你最近的）
3. 点击 **Create project**

```
┌──────────────────────────────────────┐
│  Create project                      │
│                                      │
│  Name:  homeworktracker              │
│  Region: ap-southeast (默认)          │
│                                      │
│  ┌──────────────────────┐            │
│  │  Create project  ← 点这里 │         │
│  └──────────────────────┘            │
└──────────────────────────────────────┘
```

### 2.4 获取数据库连接地址

项目创建后，页面会显示连接信息。找到 **Connection Details** 区域：

```
┌──────────────────────────────────────────────────┐
│  Connection Details                               │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ postgresql://neondb_owner:xxxxx@          │  │
│  │ ep-quiet-moon-123456.ap-southeast-1.      │  │
│  │ aws.neon.tech/neondb?sslmode=require      │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ⚠️ 先把这串地址复制到记事本保存，后面要用！        │
└──────────────────────────────────────────────────┘
```

> ⚠️ **重要**：复制 **完整** 的 `postgresql://` 开头的地址，保存到记事本。

---

## 第 3 步：安装 Fly.io 命令行工具

> Fly.io 是运行应用的地方。需要装一个命令行工具来部署。
> 这一步只需要做一次，以后不用管。

### Windows 电脑

1. 按键盘 **Win + X**，选择 **终端（管理员）** 或 **PowerShell（管理员）**
2. 在弹出的黑色窗口中，粘贴以下命令，按回车：

```powershell
powershell -c "iwr https://fly.io/install.ps1 -useb | iex"
```

3. 等待安装完成（约 30 秒）

### Mac 电脑

1. 按 **Command + 空格**，输入 **终端 (Terminal)**，打开
2. 粘贴以下命令，按回车：

```bash
curl -L https://fly.io/install.sh | sh
```

3. 等待安装完成

### 验证安装

关闭当前窗口，重新打开终端/PowerShell，输入：

```bash
flyctl version
```

如果看到类似 `flyctl v0.x.x` 的版本号，说明安装成功。

---

## 第 4 步：登录 Fly.io

### 4.1 注册账号

在终端中执行：

```bash
flyctl auth signup
```

浏览器会自动打开 Fly.io 注册页面。选择 **Sign up with GitHub**。

### 4.2 回到终端

注册完成后，切回终端，它会自动检测到登录状态。

### 4.3 添加信用卡验证（免费计划不扣费）

Fly.io 需要验证信用卡以防止滥用，但**免费计划不会扣钱**。

```bash
flyctl billing add
```

按提示操作，在浏览器中输入信用卡信息（支持国内 Visa/MasterCard）。

> 💡 如果你不放心，可以用虚拟信用卡，或者回到 Railway 方案。

---

## 第 5 步：下载代码到本地

### 5.1 打开终端

- Windows：按 **Win + X** → **终端**
- Mac：按 **Command + 空格** → 输入 **终端**

### 5.2 下载代码

```bash
git clone https://github.com/你的用户名/homeworktracker.git
cd homeworktracker
```

> 把 `你的用户名` 换成你的 GitHub 用户名。

---

## 第 6 步：部署应用

### 6.1 初始化 Fly 应用

```bash
flyctl launch
```

按提示回答：

| 问题 | 回答 |
|------|------|
| Choose a name | 直接按回车（自动生成） |
| Choose a region | 选择 `Hong Kong (hkg)` 或 `Tokyo (nrt)` 或 `Singapore (sin)` — 离中国越近越快 |
| Would you like to set up a PostgreSQL database? | **No**（我们用 Neon） |
| Would you like to deploy now? | **No**（先配置环境变量） |
| Create .dockerignore? | 按回车（默认 Yes） |

### 6.2 配置环境变量

```bash
flyctl secrets set DEPLOYMENT_MODE=network
flyctl secrets set NODE_ENV=production
flyctl secrets set JWT_SECRET=你的任#######################
flyctl secrets set DATABASE_URL="postgresql://neondb_owner:xxxxx@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
```

> ⚠️ **关键**：`DATABASE_URL` 用第 2 步保存的 Neon 连接地址。注意用双引号包起来！

### 6.3 初次部署

```bash
flyctl deploy
```

等待约 3-5 分钟，看到 `✅ Deployed successfully` 就完成了。

### 6.4 获取访问地址

```bash
flyctl open
```

浏览器会自动打开你的应用。记下地址，类似 `https://xxxxx.fly.dev`。

---

## 第 7 步：初始化数据库

### 7.1 进入服务器终端

```bash
flyctl ssh console
```

### 7.2 推送数据库表结构

```bash
npx prisma db push
```

看到 `Your database is now in sync` 后，输入 `exit` 退出。

---

## 第 8 步：开始使用

### 8.1 打开网址

浏览器打开 `https://xxxxx.fly.dev`（你的地址）。

### 8.2 注册账号

点击 **"没有账号？去注册"**，填写邮箱、昵称、密码后注册登录。

### 8.3 开始打卡

登录后就可以创建任务、打卡了。跟单机版一模一样的体验。

---

## 日常维护

### 免费额度

| 服务 | 免费额度 | 够用吗 |
|------|----------|--------|
| **Fly.io** | 3 台 256MB 虚拟机 | ✅ 绰绰有余 |
| **Neon** | 0.5GB 存储 + 1GB 计算 | ✅ 足够几千条记录 |

**永远不会**被收费，除非你主动升级。

### 如何更新应用

当 GitHub 仓库有更新时，重新部署：

```bash
cd homeworktracker
git pull
flyctl deploy
```

---

## 常见问题

### Q：部署时报错 "not enough resources"？

免费的 Fly 机器只有 256MB 内存。Node.js 应用一般够用，如果不够：

```bash
flyctl scale memory 256
```

### Q：忘记网址了？

```bash
flyctl open
```

或者在 Fly.io 控制台 [fly.io/dashboard](https://fly.io/dashboard) 查看。

### Q：数据会丢失吗？

不会。Neon 的 PostgreSQL 是永久存储的，除非你手动删除数据库。

### Q：想用自己买的域名？

```bash
flyctl certs add 你的域名.com
```

然后在域名服务商处添加对应的 DNS 记录即可。

### Q：不想用命令行怎么办？

回到 [Railway 方案](deploy-network.md)，完全不需要命令行，但免费额度只够 20-25 天。

---

## 一键命令汇总（供参考）

```bash
# 下载代码
git clone https://github.com/你的用户名/homeworktracker.git
cd homeworktracker

# 部署
flyctl launch
flyctl secrets set DEPLOYMENT_MODE=network
flyctl secrets set NODE_ENV=production
flyctl secrets set JWT_SECRET=你的任*********************
flyctl secrets set DATABASE_URL="你的Neon连接地址"
flyctl deploy

# 初始化数据库
flyctl ssh console
npx prisma db push
exit

# 打开应用
flyctl open
```

---

## 技术支持

如有问题，请在 GitHub 仓库中提交 Issue：
https://github.com/fireskyli/homeworktracker/issues