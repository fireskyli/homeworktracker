# ADR-004: 前端配置注入方案

## Status
Accepted

## Context
前端需要根据部署模式显示不同的 UI：
- 单机模式：无登录页，直接显示首页
- 网络模式：需要登录/注册页面

需要一种机制让前端知道当前部署模式。

## Decision
使用 **API 端点探测**：前端在启动时调用 `/api/config` 获取部署模式配置。

```typescript
// GET /api/config 响应
{
  "mode": "standalone" | "network",
  "features": {
    "auth": boolean,
    "registration": boolean,
    "multiFamily": boolean
  }
}
```

## Consequences

### Positive
- 前后端解耦，前端不需要构建时变量
- 同一个前端构建产物可以在两种模式下工作
- 可以动态切换（重启服务即可）
- 扩展性好，未来可以添加更多 feature flags

### Negative
- 首次加载多一次 API 请求（约 50ms）
- 在 config 加载完成前需要 loading 状态

### Neutral
- 前端需要处理 config 加载中的状态

## Alternatives Considered

**构建时环境变量（VITE_DEPLOYMENT_MODE）**
- 拒绝：需要为两种模式分别构建，无法热切换

**HTML meta 标签注入**
- 拒绝：耦合构建和部署，且需要服务端模板渲染

**Cookie 注入**
- 部分可行，但 API 端点方案更 RESTful

## References
- [docs/architecture.md](../architecture.md)