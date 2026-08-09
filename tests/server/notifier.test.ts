import { describe, it, expect } from 'vitest';
import {
  isValidDingtalkWebhook,
  buildTodayScheduleMarkdown,
  buildClassReminderMarkdown,
  buildWeeklyScheduleMarkdown,
  buildWeeklySummaryMarkdown,
  buildDailySummaryMarkdown,
} from '../../src/server/notifier';

describe('notifier 钉钉推送', () => {
  it('isValidDingtalkWebhook 校验地址', () => {
    expect(isValidDingtalkWebhook('https://oapi.dingtalk.com/robot/send?access_token=abc123')).toBe(true);
    expect(isValidDingtalkWebhook('https://oapi.dingtalk.com/robot/send?access_token=')).toBe(false);
    expect(isValidDingtalkWebhook('https://example.com/foo')).toBe(false);
    expect(isValidDingtalkWebhook('')).toBe(false);
    expect(isValidDingtalkWebhook('abc')).toBe(false);
  });

  it('buildTodayScheduleMarkdown：无课程', () => {
    const md = buildTodayScheduleMarkdown([]);
    expect(md).toContain('今天没有课程');
    expect(md).toContain('励夏的课程');
  });

  it('buildTodayScheduleMarkdown：列出课程含地点', () => {
    const md = buildTodayScheduleMarkdown([
      { name: '数学', emoji: '📖', startTime: '16:00', endTime: '17:30', location: '少年宫3楼', appName: null },
    ]);
    expect(md).toContain('数学');
    expect(md).toContain('16:00-17:30');
    expect(md).toContain('📍少年宫3楼');
    expect(md).toContain('励夏的课程');
  });

  it('buildTodayScheduleMarkdown：远程课显示 App', () => {
    const md = buildTodayScheduleMarkdown([
      { name: '英语', emoji: '🔤', startTime: '19:00', endTime: '20:00', location: null, appName: '腾讯会议' },
    ]);
    expect(md).toContain('【腾讯会议】');
    expect(md).toContain('励夏的课程');
  });

  it('buildClassReminderMarkdown：含地点/App', () => {
    const md = buildClassReminderMarkdown({
      name: '体育', emoji: '🏀', startTime: '18:00', endTime: '19:00', location: '操场', appName: null,
    });
    expect(md).toContain('体育');
    expect(md).toContain('18:00');
    expect(md).toContain('📍操场');
    expect(md).toContain('励夏的课程');

    const md2 = buildClassReminderMarkdown({
      name: '编程', emoji: '💻', startTime: '19:00', endTime: '20:00', location: null, appName: '钉钉课堂',
    });
    expect(md2).toContain('【钉钉课堂】');
    expect(md2).toContain('励夏的课程');
  });

  it('buildWeeklyScheduleMarkdown：含关键词和日期', () => {
    const start = new Date('2026-08-11T00:00:00'); // 周一
    const md = buildWeeklyScheduleMarkdown(
      [
        { name: '数学', emoji: '📖', startTime: '16:00', endTime: '17:30', location: '少年宫3楼', appName: null, repeatType: 'weekly', repeatDays: '[1,3]', date: null },
      ],
      start,
      7
    );
    expect(md).toContain('励夏的课程');
    expect(md).toContain('未来7天课程总览');
    expect(md).toContain('数学');
    expect(md).toContain('16:00-17:30');
    expect(md).toContain('📍少年宫3楼');
    expect(md).toContain('周一');
    expect(md).toContain('周三');
  });

  it('buildWeeklyScheduleMarkdown：无课程', () => {
    const start = new Date('2026-08-11T00:00:00');
    const md = buildWeeklyScheduleMarkdown([], start, 7);
    expect(md).toContain('励夏的课程');
    expect(md).toContain('无课程');
  });

  it('buildWeeklySummaryMarkdown：含周统计与科目分布', () => {
    const md = buildWeeklySummaryMarkdown({
      weekStart: '2026-08-03',
      weekEnd: '2026-08-09',
      total: 4,
      done: 20,
      rate: 71,
      checkinDays: 6,
      pointsEarned: 40,
      subjectDist: { 数学: 8, 语文: 12 },
      taskDetails: [
        { name: '数学口算', subject: '数学', emoji: '🔢', doneCount: 7, missed: false },
        { name: '练字', subject: '语文', emoji: '✍️', doneCount: 0, missed: true },
      ],
      exerciseSummary: {
        total: 5,
        suns: 12,
        byType: [{ name: '跳绳', emoji: '🪢', count: 5, suns: 12 }],
      },
    });
    expect(md).toContain('励夏的课程');
    expect(md).toContain('2026-08-03 ~ 2026-08-09');
    expect(md).toContain('完成率 **71%**');
    expect(md).toContain('打卡天数：**6** 天');
    expect(md).toContain('数学：8 次');
    expect(md).toContain('语文：12 次');
    expect(md).toContain('已完成任务');
    expect(md).toContain('数学口算');
    expect(md).toContain('未完成任务');
    expect(md).toContain('练字');
    expect(md).toContain('本周运动');
    expect(md).toContain('跳绳');
    expect(md).toContain('☀️');
  });
});