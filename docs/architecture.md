# 双模式部署架构设计文档

## 一、概述

同一套代码支持两种部署模式，通过 `DEPLOYMENT_MODE` 环境变量切换。

```
┌──────────────────────────────────────────────────────┐
│                  同一套代码                            │
│                                                       │
│  ┌──────────────────┐    ┌──────────────────┐         │
│  │  单机模式          │    │  网络模式          │         │
│  │  (standalone)    │    │  (network)       │         │
│  ├──────────────────┤    ├──────────────────┤         │
│  │ 默认模式，零配置    │    │ DEPLOYMENT_MODE   │         │
│  │ SQLite 本地文件    │    │ =network         │         │
│  │ 无用户系统         │    │ PostgreSQL 云端   │         │
│  │ 简单家长密码       │    │ 注册/登录/JWT     │         │
│  │ userId 恒为 0     │    │ 多家庭数据隔离     │         │
│  │ 局域网访问         │    │ 公网 HTTPS        │         │
│  └──────────────────┘    └──────────────────┘         │
└──────────────────────────────────────────────────────┘
```

---

## 二、核心设计决策

### 2.1 模式切换机制

```
DEPLOYMENT_MODE 环境变量
       │
       ├── standalone (默认) ──→ 现有行为，零改动
       │
       └── network ──→ 启用 JWT 认证 + 用户隔离
```

### 2.2 请求级 userId 注入

两种模式通过不同的中间件向 `req` 注入 `userId`，所有路由统一使用 `req.userId`，无需感知模式差异：

```
单机模式:
  Request → [standaloneAuth 中间件] → req.userId = 0 → 路由处理

网络模式:
  Request → [JWT 验证中间件] → req.userId = 从 token 提取 → 路由处理
```

### 2.3 数据库兼容策略

SQLite 和 PostgreSQL 共用同一份 Prisma Schema，利用 Prisma 的 provider 切换：

```
DATABASE_URL
  ├── file:./prisma/homework.db    (standalone)
  └── postgresql://...             (network)
```

差异处理：
- 自增主键：`@default(autoincrement())` 两者都支持
- 布尔值：继续用 `Int` (0/1)，避免 `Boolean` 在 SQLite 的兼容问题
- JSON 字段：`repeatDays` 用 `String` 存 JSON 字符串，不用原生 JSON 类型
- 用户表：`User` 模型在两种模式下都存在，单机模式写入哨兵行 `id=0`

---

## 三、数据模型变更

### 3.1 新增模型

```prisma
model User {
  id             Int           @id @default(autoincrement())
  email          String        @unique
  passwordHash   String
  displayName    String
  role           String        @default("parent") // parent | child
  createdAt      String
  updatedAt      String
  tasks          Task[]
  checkins       CheckIn[]
  // ... 其他关联
}
```

### 3.2 现有模型变更

所有业务表新增 `userId` 字段：

```prisma
model Task {
  // ... 现有字段不变 ...
  userId Int     @default(0)
  user   User?   @relation(fields: [userId], references: [id])
}
```

### 3.3 哨兵行

单机模式启动时自动创建 `User(id=0, email="standalone@local", displayName="本地用户")` 哨兵行，确保所有 `userId=0` 的外键引用有效。

---

## 四、认证中间件设计

### 4.1 工厂函数

```typescript
// src/server/middleware/auth.ts
export function createAuthMiddleware(mode: string) {
  if (mode === 'standalone') {
    return standaloneAuth;   // 注入 userId=0
  }
  return jwtAuth;            // 从 Authorization header 提取 JWT
}
```

### 4.2 单机模式（standaloneAuth）

```typescript
function standaloneAuth(req, res, next) {
  req.userId = 0;
  next();
}
```

### 4.3 网络模式（jwtAuth）

```typescript
function jwtAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未登录' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期' });
  }
}
```

### 4.4 家长模式中间件

原有的简单密码验证保留，但仅用于单机模式。网络模式下用 JWT + role 替代。

---

## 五、前端配置注入

### 5.1 方案：API 端点探测

前端通过 `/api/config` 获取部署模式，避免构建时注入：

```typescript
// GET /api/config
{
  "mode": "standalone" | "network",
  "features": {
    "auth": false,         // standalone 不需要登录
    "registration": false,  // standalone 不需要注册
    "multiFamily": false   // standalone 单家庭
  }
}
```

### 5.2 前端条件渲染

```tsx
const [config, setConfig] = useState<AppConfig | null>(null);

useEffect(() => {
  fetch('/api/config').then(r => r.json()).then(setConfig);
}, []);

// 条件渲染
{config?.features.auth && <LoginPage />}
{config?.features.registration && <RegisterPage />}
```

---

## 六、网络模式 API 新增端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录，返回 JWT |
| GET | /api/auth/me | 获取当前用户信息 |
| GET | /api/config | 获取部署模式配置 |

---

## 七、数据迁移路径

### 单机 → 网络升级

1. 用户在单机模式积累数据（userId=0）
2. 部署网络版，用户注册账号（userId=123）
3. 运行迁移脚本：`UPDATE task SET userId=123 WHERE userId=0`
4. 原有数据归属到新用户

### 迁移脚本预留

```typescript
// scripts/migrate-standalone-to-user.ts
// 将 userId=0 的所有数据迁移到指定用户
```

---

## 八、风险与缓解

| 风险 | 缓解 |
|------|------|
| 忘记加 userId 过滤导致数据泄露 | 网络模式中间件强制检查，无 userId 的查询返回 403 |
| Prisma Schema 在两个数据库间不兼容 | 只用交集特性（不用 PostgreSQL 专属类型） |
| 单机升级后原数据丢失 | 升级前自动备份，迁移脚本可回滚 |
| 哨兵行 id=0 与自增冲突 | SQLite/PostgreSQL 自增从 1 开始，0 永远安全 |