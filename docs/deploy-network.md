# 作业打卡系统 — 网络版部署手册

> **写给完全没有技术背景的家长**，跟着每一步截图和说明操作即可。
> 预计耗时：**30 分钟**。全部在浏览器中完成，不需要安装任何软件。

---

## 你需要准备

| 准备项 | 说明 |
|--------|------|
| 一个 GitHub 账号 | 用来存放代码和自动部署。如果没有，先去 [github.com](https://github.com) 注册 |
| 一个邮箱 | 注册 Railway 用（可以用 GitHub 直接登录） |
| 浏览器 | Chrome / Edge / Safari 都可以 |

---

## 第 1 步：把代码复制到你的 GitHub

> 这一步的意思是：把作业打卡系统的代码放到你自己的 GitHub 账号下，
> 这样 Railway 才能找到它并自动部署。

### 1.1 登录 GitHub

打开 [github.com](https://github.com)，登录你的账号。如果没有账号，点击右上角 **Sign up** 注册一个。

### 1.2 打开项目仓库

在新标签页打开：https://github.com/fireskyli/homeworktracker

### 1.3 Fork（复制）仓库

点击页面右上角的 **Fork** 按钮：

```
┌─────────────────────────────────────────────┐
│  fireskyli / homeworktracker          ⭐  Fork │
│                                         ▲     │
│                                    点这里     │
└─────────────────────────────────────────────┘
```

在弹出的页面中，直接点绿色的 **Create fork** 按钮。几秒后，你的账号下就会有一个 `你的用户名/homeworktracker` 的仓库。

---

## 第 2 步：注册 Railway（云主机平台）

### 2.1 打开 Railway

打开 [railway.app](https://railway.app)，点击 **Start a New Project** 或 **Login**。

### 2.2 用 GitHub 登录

选择 **Login with GitHub**，授权 Railway 访问你的 GitHub 账号。

```
┌────────────────────────────────┐
│   登录 Railway                  │
│                                │
│   ┌──────────────────────┐     │
│   │ Login with GitHub  ← 点这个 │
│   └──────────────────────┘     │
└────────────────────────────────┘
```

---

## 第 3 步：创建项目并部署

### 3.1 新建项目

登录后，点击 **New Project**。

```
┌───────────────────────────────┐
│  Railway 首页                  │
│                               │
│  ┌───────────────────────┐    │
│  │  + New Project   ← 点这里  │
│  └───────────────────────┘    │
└───────────────────────────────┘
```

### 3.2 选择部署方式

选择 **Deploy from GitHub repo**。

### 3.3 选择你的仓库

在弹出的列表中，找到 **你的用户名/homeworktracker**，点击选中。

> 如果没有看到这个仓库，点击页面上的 **Configure GitHub App** 链接，
> 选择你的 homeworktracker 仓库，授予权限后返回重试。

### 3.4 添加 PostgreSQL 数据库

项目创建后，你会看到一个卡片（Service）。现在添加数据库：

1. 在项目页面右侧或上方，找到 **New** 按钮
2. 选择 **Database**
3. 选择 **PostgreSQL**

```
┌──────────────────────────────────┐
│  项目名                           │
│  ┌──────────┐  ┌──────────┐      │
│  │ homework │  │ Postgres │      │
│  │ tracker  │  │    ← 新增 │      │
│  └──────────┘  └──────────┘      │
└──────────────────────────────────┘
```

Railway 会自动创建一个 PostgreSQL 数据库实例，几秒钟后变成绿色表示就绪。

### 3.5 配置环境变量

点击你的 **homeworktracker** 服务卡片，进入设置页面，找到 **Variables**（变量）标签。

点击 **+ New Variable**，添加以下三个变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DEPLOYMENT_MODE` | `network` | 启用网络模式 |
| `JWT_SECRET` | 随便输入一串英文字符，越长越好 | 用来加密登录凭证 |
| `NODE_ENV` | `production` | 生产模式 |

```
┌────────────────────────────────────────────┐
│  Variables                                  │
│                                             │
│  DEPLOYMENT_MODE    network                 │
│  JWT_SECRET         aBcDeFgHiJkLmNoPqRsTu  │
│  NODE_ENV           production              │
│  DATABASE_URL       (自动生成，不要改)        │
│                                             │
│  ┌──────────────┐                           │
│  │ + New Variable │                         │
│  └──────────────┘                           │
└────────────────────────────────────────────┘
```

> ⚠️ **注意**：`DATABASE_URL` 是 Railway 自动创建的，**不要修改或删除**。
> 它的值类似 `postgresql://postgres:xxx@containers-us-west-xxx.railway.app:xxxx/railway`

### 3.6 重新部署

添加完环境变量后，Railway 会自动重新部署。你也可以手动触发：

在 homeworktracker 服务卡片右上角，点击 **⋮** → **Redeploy**。

---

## 第 4 步：等待部署完成

### 4.1 查看部署状态

点击 homeworktracker 卡片，在 **Deployments** 标签下可以看到构建进度：

```
正在构建...
├── Installing dependencies...
├── Building...
├── Starting server...
└── ✅ Deployed!
```

整个过程大约需要 **2-3 分钟**。看到绿色的 `✅ Deployed` 就完成了。

### 4.2 获取访问地址

在 homeworktracker 服务卡片中，找到 **Settings** → **Public Networking**，你会看到一个域名：

```
https://homeworktracker-production-xxxx.up.railway.app
```

这就是你的作业打卡系统网址！复制它。

---

## 第 5 步：开始使用

### 5.1 打开网址

在浏览器中打开上一步复制的网址。

### 5.2 注册账号

你会看到一个登录页面。点击 **"没有账号？去注册"**，填写：

| 字段 | 填写 |
|------|------|
| 邮箱 | 你的真实邮箱（不会发送验证邮件） |
| 昵称 | 你的称呼，比如「小明妈妈」 |
| 密码 | 至少 6 位，**记住它** |

点击 **注册**，自动登录进入系统。

### 5.3 开始打卡

登录后就是熟悉的打卡首页。你可以：

1. 在「任务管理」页面（底部导航栏第二个图标）添加孩子的作业任务
2. 回到首页，点击任务旁的「完成」按钮打卡
3. 在「统计」页面查看孩子的完成情况

---

## 第 6 步：邀请孩子使用

### 方式一：孩子用同一账号

大人注册一个账号后，孩子可以和大人共用同一个账号。

手机打开同样的网址，用同一组邮箱和密码登录即可。

### 方式二：创建子账号（未来版本）

> 当前版本所有家庭成员共用同一账号。
> 多用户管理功能将在后续版本中支持。

---

## 日常维护

### 数据会自动保存

Railway PostgreSQL 会持久保存你的所有数据，**不会丢失**。

### 免费额度

Railway 免费计划包含：
- **每月 $5 额度**，大约可以运行 20-25 天
- 额度用完服务会暂停，下个月自动恢复
- 如需 7×24 运行，可升级到 Hobby 计划（$5/月，约 ¥36）

### 如何升级付费（可选）

在 Railway 项目设置 → **Billing** → 选择 **Hobby** 计划。

---

## 常见问题

### Q：网址太长了，能自定义吗？

Railway 免费版提供的是默认域名。如果你有自己的域名（如 `daka.jiating.com`），可以在 Railway 的 Settings → Custom Domain 中绑定。

购买域名的平台：阿里云万网、腾讯云 DNSPod，一般每年 30-60 元。

### Q：忘记密码了怎么办？

当前版本没有密码找回功能。如果忘记了：
1. 打开 Railway 项目，进入 PostgreSQL 数据库
2. 点击 **Data** 标签
3. 找到 `User` 表，可以查看注册邮箱
4. 重新注册一个新账号（用不同邮箱）

后续版本会加入密码找回功能。

### Q：服务突然无法访问？

1. 检查 Railway 项目状态，看是否有红色错误提示
2. 检查免费额度是否用完（Billing 页面查看）
3. 点击 **Redeploy** 重新部署

### Q：想用自己家里的电脑当服务器（不用 Railway）？

参考 README.md 中的「单机模式」：
```bash
npm install
npx prisma db push
npm run dev
```
在 http://localhost:5173 打开即可使用。适合局域网内家庭使用。

---

## 技术支持

如有问题，请在 GitHub 仓库中提交 Issue：
https://github.com/fireskyli/homeworktracker/issues

描述你的问题，附上截图更好。
