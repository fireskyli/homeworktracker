# Plan: 积分商城功能

## Context
当前积分兑换页面只支持家长手动创建兑换记录。需要新增"积分商城"功能：
- **家长**：在兑换页面内管理商品（增/删/改，含名称、描述、积分价格、图片选填）
- **学生**：浏览商品列表，选择商品提交兑换申请
- **家长**：在兑换记录中审批申请（确认后扣积分）

## 数据模型变更

### 新增 `Product` 表（prisma/schema.prisma）

```prisma
model Product {
  id          Int     @id @default(autoincrement())
  name        String
  description String?
  points      Int     // 所需积分
  photoUrl    String? // 商品图片（选填）
  isActive    Int     @default(1) // 1=上架 0=下架
  sortOrder   Int     @default(0)
  createdAt   String
}
```

### 修改 `Redemption` 表

新增两个字段：
```prisma
model Redemption {
  ...existing fields...
  productId   Int?    // 关联商品（申请时填入）
  status      String  @default("pending") // pending | approved | rejected
  appliedAt   String? // 申请时间
  approvedAt  String? // 审批时间
}
```

需要执行 `npx prisma db push`（SQLite 支持增量变更）。

## 后端 API

### 商品管理路由 `src/server/routes/products.ts`（新建）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/products` | 获取所有上架商品 | 所有人 |
| POST | `/api/products` | 创建商品 | 家长密码 |
| PUT | `/api/products/:id` | 更新商品 | 家长密码 |
| DELETE | `/api/products/:id` | 软删除（isActive=0） | 家长密码 |

### 修改兑换路由 `src/server/routes/redemptions.ts`

1. **提交申请**：
   - `POST /api/redemptions/apply` — 学生提交申请（传 productId）
   - 校验：积分余额足够、商品存在且上架
   - 创建 Redemption 记录（status=pending, appliedAt=now）

2. **审批申请**：
   - `POST /api/redemptions/:id/approve` — 家长审批通过
   - 校验家长密码
   - 扣减积分（balance 校验）、更新 status=approved、approvedAt=now

3. **拒绝申请**：
   - `POST /api/redemptions/:id/reject` — 家长拒绝
   - 更新 status=rejected

4. **修改 GET /api/redemptions**：
   - 返回结果附带 product 信息（left join）
   - 学生端只显示自己的申请（按 status 过滤）

### 注册路由 `src/server/app.ts`

```typescript
import { productsRouter } from './routes/products';
app.use('/api/products', productsRouter);
```

## 前端页面

### 修改 `src/client/pages/RedemptionPage.tsx`

#### 学生端（默认视图）
- 顶部：积分余额（已有）
- 中部：商品网格（图片 + 名称 + 所需积分）
- 点击商品：弹出确认框（"确认用 X 积分兑换 [商品名]？"）
- 底部：我的申请列表（状态：待审批/已通过/已拒绝）

#### 家长端（切换到家长模式后）
- 商品管理区域：+ 新增商品按钮
- 商品列表：编辑/删除按钮
- 新增商品表单弹窗：名称、描述、积分价格、图片上传（选填）
- 申请列表：待审批项显示"通过"/"拒绝"按钮

### 新增前端钩子 `src/client/hooks/useProducts.ts`

```typescript
const API = '/api/products';

export async function fetchProducts(): Promise<Product[]>
export async function createProduct(data: {...}, password: string): Promise<Product>
export async function updateProduct(id: number, data: {...}, password: string): Promise<Product>
export async function deleteProduct(id: number, password: string): Promise<void>
export async function applyRedemption(productId: number): Promise<Redemption>
export async function approveRedemption(id: number, password: string): Promise<void>
export async function rejectRedemption(id: number, password: string): Promise<void>
```

### 类型定义 `src/client/types/index.ts`

```typescript
export interface Product {
  id: number;
  name: string;
  description: string | null;
  points: number;
  photoUrl: string | null;
  isActive: number;
  sortOrder: number;
  createdAt: string;
}
```

### 修改 NavBar `src/client/components/NavBar.tsx`

无需修改（复用现有的 /redeem 路由）。

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `prisma/schema.prisma` | 修改 | 新增 Product 表，Redemption 表加字段 |
| `src/server/routes/products.ts` | 新建 | 商品 CRUD API |
| `src/server/routes/redemptions.ts` | 修改 | 新增 apply/approve/reject 端点 |
| `src/server/app.ts` | 修改 | 注册 products 路由 |
| `src/client/hooks/useProducts.ts` | 新建 | 商品 + 申请相关 hooks |
| `src/client/pages/RedemptionPage.tsx` | 修改 | 重写为商城视图 |
| `src/client/types/index.ts` | 修改 | 新增 Product 接口 |

## 验证步骤

1. `npx prisma db push` — 应用数据库变更
2. `npm run build` — 确保编译通过
3. `npm start` — 启动服务
4. 家长模式：添加商品（含图片上传）
5. 学生端：浏览商品、提交申请
6. 家长端：审批/拒绝申请，确认积分扣减
7. 检查积分余额变化正确
