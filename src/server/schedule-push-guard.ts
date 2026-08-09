// ── 推送熔断守卫 ──────────────────────────────────────────
// 目的：当数据库/磁盘等持久化层出现故障时，避免定时推送任务在每一 tick
// 都失败并反复发送消息（刷屏）。检测到持久化错误后开启熔断，暂停推送，
// 冷却一段时间后自动重试恢复。

/**
 * 判断错误是否属于「持久化层故障」（数据库不可写/磁盘满等）。
 * 这类错误短期内大概率持续，重试无意义，应触发熔断。
 */
export function isPersistentError(err: unknown): boolean {
  if (!err) return false;
  const msg = String(err);
  // SQLite 磁盘满 / 只读 / IO 错误 —— 明确的持久化故障
  if (msg.includes('database or disk is full')) return true;
  if (msg.includes('attempt to write a readonly database')) return true;
  if (msg.includes('disk I/O error')) return true;
  if (msg.includes('unable to open database file')) return true;
  // 数据库连接不可达（通常是服务端持久化层故障）
  if (msg.includes("Can't reach database server")) return true;
  if (msg.includes('Connection refused')) return true;
  // Prisma 未知请求错误：仅当同时包含磁盘/IO 关键词时判定为持久故障，
  // 避免把参数校验等瞬时问题误判为持久故障。
  if (msg.includes('PrismaClientUnknownRequestError')) {
    return /disk|full|readonly|I\/O|out of space/i.test(msg);
  }
  return false;
}

/**
 * 推送熔断守卫。
 * 维护熔断状态：连续持久化错误达到阈值后开启熔断，冷却期结束自动关闭。
 */
export class PushBreaker {
  private consecutiveFailures = 0;
  private openUntil = 0;
  private readonly threshold: number;
  private readonly cooldownMs: number;

  constructor(threshold = 3, cooldownMs = 30 * 60 * 1000) {
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
  }

  /** 是否处于熔断开启状态（此时应跳过推送）。只读查询，不含副作用。 */
  isOpen(now = Date.now()): boolean {
    return this.openUntil !== 0 && now < this.openUntil;
  }

  /** 若冷却已到期则自动关闭熔断。每次运行前调用。 */
  maybeRecover(now = Date.now()): void {
    if (this.openUntil !== 0 && now >= this.openUntil) {
      this.reset();
    }
  }

  /** 记录一次失败。若为持久化错误且连续失败达到阈值，开启熔断。 */
  recordFailure(err: unknown, now = Date.now()): void {
    if (isPersistentError(err)) {
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= this.threshold) {
        this.openUntil = now + this.cooldownMs;
      }
    } else {
      // 非持久化错误（如网络瞬时抖动）不累计
      this.consecutiveFailures = 0;
    }
  }

  /** 记录一次成功，重置计数和熔断状态 */
  recordSuccess(): void {
    this.reset();
  }

  private reset(): void {
    this.consecutiveFailures = 0;
    this.openUntil = 0;
  }

  /** 剩余冷却毫秒数（仅用于日志） */
  remainingMs(now = Date.now()): number {
    return Math.max(0, this.openUntil - now);
  }
}

/** 模块级单例：所有推送任务共享同一熔断状态 */
export const pushBreaker = new PushBreaker();