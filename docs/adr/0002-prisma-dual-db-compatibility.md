# ADR-002: Prisma Schema 双数据库兼容策略

## Status
Accepted

## Context
项目需要同时支持 SQLite（单机模式）和 PostgreSQL（网络模式）。Prisma 支持通过 `DATABASE_URL` 切换 provider，但两种数据库在数据类型、SQL 语法上有差异。

## Decision
使用 **Prisma 交集特性**：只使用 SQLite 和 PostgreSQL 都支持的字段类型和操作：

| 需求 | 选择 | 原因 |
|------|------|------|
| 自增主键 | `@default(autoincrement())` | 两者都支持 |
| 布尔值 | `Int` (0/1) | SQLite 的 `Boolean` 在 Prisma 中不稳定 |
| 日期/时间 | `String` (ISO8601/YYYY-MM-DD) | 避免 `DateTime` 在不同数据库的时区差异 |
| JSON 数组 | `String` (存 JSON 字符串) | SQLite 无原生 JSON 类型，PostgreSQL 有 JSONB 但行为不同 |
| 唯一约束 | `@unique` | 两者都支持 |
| 外键 | `@relation` | 两者都支持 |

## Consequences

### Positive
- 同一份 `schema.prisma` 无需修改即可切换数据库
- 零运行时数据库适配代码
- 现有代码无需因数据库切换而改动

### Negative
- 无法利用 PostgreSQL 的 JSONB 索引、数组类型等高级特性
- JSON 字段查询需要在应用层解析（而非数据库层）
- 日期比较用字符串而非原生日期函数，性能略低
- 无法使用 PostgreSQL 的 `ENUM` 类型

### Neutral
- 如果未来有精力，可以为 PostgreSQL 单独优化 Schema，但当前阶段不优先

## Alternatives Considered

**两套 Schema**
- 拒绝：维护成本翻倍，容易不同步

**只用 PostgreSQL**
- 拒绝：破坏单机模式的零配置体验（SQLite 无需安装数据库服务）

**抽象数据访问层**
- 拒绝：过度设计，Prisma 已经提供了足够的抽象

## References
- [Prisma SQLite vs PostgreSQL 兼容性](https://www.prisma.io/docs/orm/reference/prisma-schema-reference#field-types)
- [docs/architecture.md](../architecture.md)