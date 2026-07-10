# ADR-001: userId 哨兵值使用 0

## Status
Accepted

## Context
双模式架构要求所有业务表添加 `userId` 字段。在单机模式（standalone）下，不存在真实用户，需要为所有数据分配一个默认的 "哨兵" userId 值。

候选方案：
- **null**：userId 允许为空，单机模式不填
- **0**：userId 永远为 0
- **-1**：userId 为 -1

## Decision
使用 `userId: Int @default(0)`，单机模式所有数据 userId=0。

## Consequences

### Positive
- SQLite 和 PostgreSQL 自增主键都从 1 开始，0 永远不会与实际用户 ID 冲突
- 所有查询统一使用 `WHERE userId = ?`，无需区分 `IS NULL` 和 `= ?`
- 创建 `User(id=0, email="standalone@local")` 哨兵行，外键引用有效
- 从单机升级到网络模式时，迁移脚本只需 `UPDATE ... SET userId=新ID WHERE userId=0`

### Negative
- 需要维护哨兵行（但这是一次性创建）
- 0 值在调试时可能引起困惑（需文档说明）

### Neutral
- Prisma 的 `@default(0)` 在 INSERT 时自动填充，无需代码改动

## Alternatives Considered

**null**
- 拒绝：查询需要 `WHERE userId IS NULL`（单机）和 `WHERE userId = ?`（网络），代码分支复杂

**-1**
- 拒绝：功能等价于 0，但 0 比 -1 更直观

## References
- [docs/architecture.md](../architecture.md)