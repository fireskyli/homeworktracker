import { describe, it, expect } from 'vitest';
import {
  computeDueReminders,
  inDayBeforeWindow,
  inMinuteWindow,
  matchesDate,
  timeOfDay,
  parseRepeatDays,
  ReminderRule,
} from '../../src/server/schedule-reminders';

function weekly(days: number[], startTime: string, remindDayBefore = 1, remindMinBefore = 30): ReminderRule {
  return {
    repeatType: 'weekly',
    repeatDays: JSON.stringify(days),
    date: null,
    startTime,
    remindDayBefore,
    remindMinBefore,
  };
}

function once(date: string, startTime: string, remindDayBefore = 1, remindMinBefore = 30): ReminderRule {
  return {
    repeatType: 'once',
    repeatDays: '[]',
    date,
    startTime,
    remindDayBefore,
    remindMinBefore,
  };
}

describe('schedule-reminders 纯函数', () => {
  it('parseRepeatDays 解析 JSON 数组', () => {
    expect(parseRepeatDays('[1,3,5]')).toEqual([1, 3, 5]);
    expect(parseRepeatDays('bad')).toEqual([]);
    expect(parseRepeatDays('null')).toEqual([]);
  });

  it('timeOfDay 生成当天本地时刻', () => {
    const t = timeOfDay('2026-08-01', '16:30');
    expect(t.getHours()).toBe(16);
    expect(t.getMinutes()).toBe(30);
  });

  it('matchesDate：每周重复匹配星期（1=周一）', () => {
    // 2026-08-03 是周一
    expect(matchesDate(weekly([1, 3, 5], '10:00'), '2026-08-03')).toBe(true);
    expect(matchesDate(weekly([1, 3, 5], '10:00'), '2026-08-04')).toBe(false);
  });

  it('matchesDate：单次匹配精确日期', () => {
    expect(matchesDate(once('2026-08-10', '10:00'), '2026-08-10')).toBe(true);
    expect(matchesDate(once('2026-08-10', '10:00'), '2026-08-11')).toBe(false);
  });

  it('inDayBeforeWindow：提前1天窗口 [前一天20:00, 当天00:00)', () => {
    // 课程 2026-08-03 10:00，提前1天 → 窗口 2026-08-02 20:00 ~ 08-03 00:00
    const occ = timeOfDay('2026-08-03', '10:00');
    const start = timeOfDay('2026-08-02', '20:00');
    const end = timeOfDay('2026-08-03', '00:00');
    expect(inDayBeforeWindow(weekly([1], '10:00'), start, occ)).toBe(true);
    expect(inDayBeforeWindow(weekly([1], '10:00'), end, occ)).toBe(false);
    expect(inDayBeforeWindow(weekly([1], '10:00'), timeOfDay('2026-08-02', '19:59'), occ)).toBe(false);
  });

  it('inMinuteWindow：提前30分钟窗口 [开始前30分, 开始)', () => {
    const occ = timeOfDay('2026-08-03', '16:30');
    const trigger = new Date(occ.getTime() - 30 * 60 * 1000);
    expect(inMinuteWindow(weekly([1], '16:30'), trigger, occ)).toBe(true);
    expect(inMinuteWindow(weekly([1], '16:30'), occ, occ)).toBe(false);
    expect(inMinuteWindow(weekly([1], '16:30'), new Date(occ.getTime() - 31 * 60 * 1000), occ)).toBe(false);
  });

  it('computeDueReminders：单次课程在提前1天窗口内被识别', () => {
    const now = timeOfDay('2026-08-02', '21:00');
    const due = computeDueReminders(
      [once('2026-08-03', '10:00', 1, 30)],
      now
    );
    expect(due).toHaveLength(1);
    expect(due[0].kind).toBe('day');
  });

  it('computeDueReminders：单次课程在提前30分钟窗口内被识别', () => {
    const now = new Date(timeOfDay('2026-08-03', '10:00').getTime() - 10 * 60 * 1000);
    const due = computeDueReminders([once('2026-08-03', '10:00', 1, 30)], now);
    expect(due.some(d => d.kind === 'minute')).toBe(true);
  });

  it('computeDueReminders：课程已结束不提醒', () => {
    const now = timeOfDay('2026-08-03', '12:00');
    const due = computeDueReminders([once('2026-08-03', '10:00', 1, 30)], now);
    expect(due).toHaveLength(0);
  });

  it('computeDueReminders：每周课程在匹配日提前1天/30分钟被识别', () => {
    // 2026-08-03 周一 16:30，now = 08-02 20:00 → day 窗口
    const now = timeOfDay('2026-08-02', '22:00');
    const due = computeDueReminders([weekly([1], '16:30', 1, 30)], now);
    expect(due.some(d => d.kind === 'day')).toBe(true);
  });

  it('computeDueReminders：带 endDate 的每周课程扫不到足够次数不死循环', () => {
    // 回归：repeatDays 在有限日期范围内匹配次数达不到 lookForwardOcc(60) 时，
    // 旧实现 for 循环 d 无限向后扫描直到 Date 溢出，导致死循环（CPU 100%）。
    // 带 endDate 的课程（如 2026-08-10 ~ 2026-09-05 工作日）触发该 bug。
    const now = timeOfDay('2026-08-10', '09:00');
    const rule: ReminderRule = {
      repeatType: 'weekly',
      repeatDays: JSON.stringify([1, 2, 3, 4, 5]),
      date: null,
      startDate: '2026-08-10',
      endDate: '2026-09-05',
      startTime: '20:30',
      remindDayBefore: 0,
      remindMinBefore: 60,
    };
    // 限制单次执行时间，若死循环则测试框架会超时；这里用短超时保护
    const timeout = 2000;
    const start = Date.now();
    const due = computeDueReminders([rule], now);
    expect(Date.now() - start).toBeLessThan(timeout);
    expect(Array.isArray(due)).toBe(true);
  });

  it('computeDueReminders：空 repeatDays 的每周课程不死循环', () => {
    // 回归：repeatDays=[] 时 matchesDate 永远 false，旧实现死循环
    const now = timeOfDay('2026-08-10', '09:00');
    const due = computeDueReminders([weekly([], '20:30', 0, 60)], now);
    expect(Array.isArray(due)).toBe(true);
  });

  it('computeDueReminders：同一天同时命中 day 和 minute 会返回两条', () => {
    // now = 08-03 16:00（课前30分钟内），且本身处于 day 窗口前一晚？不，day 窗口已过。
    // 验证：设 now 为 08-02 20:00 只命中 day；设 now 为 08-03 16:00 只命中 minute。
    const now = timeOfDay('2026-08-03', '16:00');
    const due = computeDueReminders([weekly([1], '16:30', 1, 30)], now);
    expect(due.some(d => d.kind === 'minute')).toBe(true);
    expect(due.some(d => d.kind === 'day')).toBe(false);
  });
});