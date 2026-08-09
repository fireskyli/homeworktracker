import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isPersistentError, PushBreaker } from '../src/server/schedule-push-guard';

describe('isPersistentError', () => {
  it('识别 SQLite 磁盘满错误', () => {
    const err = new Error('Error occurred during query execution: ConnectorError(QueryError(SqliteError { extended_code: 13, message: "database or disk is full" }))');
    expect(isPersistentError(err)).toBe(true);
  });

  it('含磁盘/IO 描述的 Prisma 未知请求错误识别为持久错误', () => {
    const err = new Error('PrismaClientUnknownRequestError: database or disk is full');
    expect(isPersistentError(err)).toBe(true);
  });

  it('无磁盘/IO 描述的 Prisma 未知错误不判为持久错误', () => {
    const err = new Error('PrismaClientUnknownRequestError: Invalid prisma.setting.upsert() invocation for unknown field');
    expect(isPersistentError(err)).toBe(false);
  });

  it('识别只读数据库错误', () => {
    expect(isPersistentError(new Error('attempt to write a readonly database'))).toBe(true);
  });

  it('数据库锁竞争（瞬时）不判为持久错误', () => {
    expect(isPersistentError(new Error('database is locked'))).toBe(false);
  });

  it('非持久化错误（如网络抖动）返回 false', () => {
    expect(isPersistentError(new Error('fetch failed: ECONNRESET'))).toBe(false);
    expect(isPersistentError(new Error('timeout'))).toBe(false);
    expect(isPersistentError(null)).toBe(false);
    expect(isPersistentError(undefined)).toBe(false);
  });
});

describe('PushBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('连续持久化错误达到阈值后开启熔断', () => {
    const breaker = new PushBreaker(3, 1000);
    expect(breaker.isOpen()).toBe(false);

    breaker.recordFailure(new Error('database or disk is full'));
    breaker.recordFailure(new Error('database or disk is full'));
    expect(breaker.isOpen()).toBe(false);

    breaker.recordFailure(new Error('database or disk is full'));
    expect(breaker.isOpen()).toBe(true);
  });

  it('非持久化错误不累计到熔断阈值', () => {
    const breaker = new PushBreaker(3, 1000);
    breaker.recordFailure(new Error('network timeout'));
    breaker.recordFailure(new Error('network timeout'));
    breaker.recordFailure(new Error('network timeout'));
    // 连续多次非持久化错误不应触发熔断
    expect(breaker.isOpen()).toBe(false);
  });

  it('熔断冷却结束后可恢复', () => {
    const breaker = new PushBreaker(1, 1000);
    breaker.recordFailure(new Error('database or disk is full'));
    expect(breaker.isOpen()).toBe(true);

    // 冷却未到期时 isOpen 仍为 true
    vi.advanceTimersByTime(999);
    expect(breaker.isOpen()).toBe(true);

    // 冷却到期后调用 maybeRecover 关闭熔断
    vi.advanceTimersByTime(2);
    breaker.maybeRecover();
    expect(breaker.isOpen()).toBe(false);
  });

  it('成功可重置熔断状态', () => {
    const breaker = new PushBreaker(3, 10000);
    breaker.recordFailure(new Error('database or disk is full'));
    breaker.recordFailure(new Error('database or disk is full'));
    breaker.recordSuccess();
    breaker.recordFailure(new Error('database or disk is full'));
    breaker.recordFailure(new Error('database or disk is full'));
    // 成功重置后，需要重新累计到阈值
    expect(breaker.isOpen()).toBe(false);
  });

  it('remainingMs 返回剩余冷却时间', () => {
    const breaker = new PushBreaker(1, 60000);
    breaker.recordFailure(new Error('database or disk is full'));
    expect(breaker.remainingMs()).toBeGreaterThan(0);
    breaker.recordSuccess();
    expect(breaker.remainingMs()).toBe(0);
  });
});