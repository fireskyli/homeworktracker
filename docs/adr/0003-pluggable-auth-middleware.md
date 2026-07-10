# ADR-003: 可插拔认证中间件设计

## Status
Accepted

## Context
单机模式和网络模式需要完全不同的认证机制：
- 单机模式：无需认证，家长密码只是前端门禁
- 网络模式：JWT 认证，每个请求需要验证身份

两种模式共用同一套路由代码，认证逻辑必须可插拔。

## Decision
使用 **中间件工厂模式**：根据 `DEPLOYMENT_MODE` 创建不同的认证中间件，统一向 `req` 注入 `userId`。

```typescript
// src/server/middleware/auth.ts
export function createAuthMiddleware(mode: string) {
  if (mode === 'network') return jwtAuth;
  return standaloneAuth;
}
```

路由层只使用 `req.userId`，不感知认证方式。

## Consequences

### Positive
- 路由代码零改动，`req.userId` 总是可用
- 新增认证方式只需添加新的中间件，不影响路由
- 单机模式零开销（standaloneAuth 只是一个赋值语句）
- 网络模式的 JWT 验证集中在中间件层，便于审计

### Negative
- `req.userId` 需要扩展 Express 的 Request 类型
- 中间件在请求链最前面，如果 JWT 验证失败，所有路由都不可用

### Neutral
- 家长密码验证在单机模式保留，但变为前端门禁（不再作为 API 认证手段）

## Alternatives Considered

**每个路由内部判断**
- 拒绝：代码重复，容易遗漏

**两个独立的路由文件**
- 拒绝：维护成本翻倍，逻辑重复

**条件编译**
- 拒绝：构建时决定，无法热切换

## References
- [docs/architecture.md](../architecture.md)