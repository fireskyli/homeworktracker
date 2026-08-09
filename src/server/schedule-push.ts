// ── 课程表推送调度 ──────────────────────────────
// 向钉钉群推送今日课表 + 上课前提醒。
// 配置存于 Setting 表（key 前缀 dingtalk:）。
// 约束：本地 PC 可能无法 24 小时开机 → 开机补发 + 启动后定时。

import { prisma } from './db';
import { STANDALONE_USER_ID } from './config';
import {
  sendDingtalkMarkdown,
  buildTodayScheduleMarkdown,
  buildClassReminderMarkdown,
  isValidDingtalkWebhook,
} from './notifier';
import { computeDueReminders, ReminderRule } from './schedule-reminders';

// Setting keys
const KEY_WEBHOOK = 'dingtalk:webhook';
const KEY_ENABLED = 'dingtalk:enabled';
const KEY_LAST_DAILY = 'dingtalk:lastDaily';   // 上次推送今日课表的日期 YYYY-MM-DD
const KEY_LAST_CLASS = 'dingtalk:lastClass';   // 上次上课提醒的标识（由调用方生成）

const DAILY_PUSH_TIME = { hour: 7, minute: 0 }; // 每天 07:00 推送今日课表
const CLASS_REMIND_MIN = 60;                     // 上课前 1 小时提醒

interface PushConfig {
  webhook: string;
  enabled: boolean;
}

/** 读取推送配置（单机模式用哨兵用户 id=0） */
export async function getPushConfig(userId = STANDALONE_USER_ID): Promise<PushConfig> {
  const [webhook, enabled] = await Promise.all([
    prisma.setting.findUnique({ where: { key: KEY_WEBHOOK, userId } }),
    prisma.setting.findUnique({ where: { key: KEY_ENABLED, userId } }),
  ]);
  return {
    webhook: webhook?.value || '',
    enabled: enabled?.value === '1',
  };
}

/** 保存推送配置 */
export async function savePushConfig(
  config: { webhook: string; enabled: boolean },
  userId = STANDALONE_USER_ID
): Promise<PushConfig> {
  if (config.enabled && !isValidDingtalkWebhook(config.webhook)) {
    throw new Error('开启推送需填写有效的钉钉机器人 webhook 地址');
  }
  await prisma.setting.upsert({
    where: { key: KEY_WEBHOOK, userId },
    update: { value: config.webhook },
    create: { key: KEY_WEBHOOK, value: config.webhook, userId },
  });
  await prisma.setting.upsert({
    where: { key: KEY_ENABLED, userId },
    update: { value: config.enabled ? '1' : '0' },
    create: { key: KEY_ENABLED, value: config.enabled ? '1' : '0', userId },
  });
  return { webhook: config.webhook, enabled: config.enabled };
}

/** 读取某 key 的 Setting 值 */
async function getSetting(key: string, userId: number): Promise<string | null> {
  const s = await prisma.setting.findUnique({ where: { key, userId } });
  return s?.value ?? null;
}

/** 写入某 key 的 Setting 值 */
async function setSetting(key: string, value: string, userId: number): Promise<void> {
  await prisma.setting.upsert({
    where: { key, userId },
    update: { value },
    create: { key, value, userId },
  });
}

/** 获取某用户今天的课程（按发生规则匹配） */
function todaySchedule(
  entries: { repeatType: string; repeatDays: string; date: string | null; startTime: string; endTime: string; name: string; emoji: string; location: string | null; appName: string | null }[],
  todayStr: string
) {
  return entries.filter(e => {
    const d = new Date(todayStr + 'T00:00:00');
    if (e.repeatType === 'weekly') {
      try {
        return JSON.parse(e.repeatDays).includes(d.getDay());
      } catch {
        return false;
      }
    }
    return e.date === todayStr;
  });
}

/** 推送今日课表。返回是否推送成功。 */
export async function pushDailySchedule(userId = STANDALONE_USER_ID): Promise<boolean> {
  const config = await getPushConfig(userId);
  if (!config.enabled || !config.webhook) return false;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const entries = await prisma.scheduleEntry.findMany({
    where: { isActive: 1, userId },
  });

  const items = todaySchedule(entries, todayStr).map(e => ({
    name: e.name, emoji: e.emoji, startTime: e.startTime, endTime: e.endTime,
    location: e.location, appName: e.appName,
  }));

  const md = buildTodayScheduleMarkdown(items);
  const res = await sendDingtalkMarkdown(config.webhook, '📅 今日课表', md);
  if (res.ok) {
    await setSetting(KEY_LAST_DAILY, todayStr, userId);
  }
  return res.ok;
}

/** 推送上课前 1 小时提醒。返回推送的提醒数量。 */
export async function pushClassReminders(userId = STANDALONE_USER_ID): Promise<number> {
  const config = await getPushConfig(userId);
  if (!config.enabled || !config.webhook) return 0;

  const entries = await prisma.scheduleEntry.findMany({
    where: { isActive: 1, userId },
  });

  const rules: ReminderRule[] = entries.map(e => ({
    repeatType: e.repeatType,
    repeatDays: e.repeatDays,
    date: e.date,
    startTime: e.startTime,
    remindDayBefore: 0,       // 不推送提前1天
    remindMinBefore: CLASS_REMIND_MIN,
  }));

  const now = new Date();
  const due = computeDueReminders(rules, now);

  let pushed = 0;
  for (const d of due) {
    const key = `${d.rule.repeatType}:${d.rule.date ?? ''}:${d.rule.startTime}:${d.occ.toDateString()}`;
    const last = await getSetting(KEY_LAST_CLASS, userId);
    if (last === key) continue; // 已推送过，去重

    const entry = entries.find(e =>
      e.repeatType === d.rule.repeatType &&
      e.repeatDays === d.rule.repeatDays &&
      e.date === d.rule.date &&
      e.startTime === d.rule.startTime
    );
    if (!entry) continue;

    const md = buildClassReminderMarkdown({
      name: entry.name, emoji: entry.emoji,
      startTime: entry.startTime, endTime: entry.endTime,
      location: entry.location, appName: entry.appName,
    });
    const res = await sendDingtalkMarkdown(config.webhook, `⏰ ${entry.name} 即将开始`, md);
    if (res.ok) {
      await setSetting(KEY_LAST_CLASS, key, userId);
      pushed++;
    }
  }
  return pushed;
}

/** 启动推送调度：开机补发当日课表 + 设定时器 */
export function startSchedulePush(userId = STANDALONE_USER_ID): void {
  // 开机补发：若今天还没推过今日课表，立即推送
  void (async () => {
    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    const lastDaily = await getSetting(KEY_LAST_DAILY, userId);
    if (lastDaily !== todayStr) {
      const ok = await pushDailySchedule(userId);
      if (ok) console.log('[Push] 开机补发今日课表成功');
    }
  })();

  // 定时器：每分钟检查一次（上课前1小时提醒窗口按分钟粒度）
  const minuteTimer = setInterval(() => {
    void pushClassReminders(userId).catch(err => console.error('[Push] 上课提醒失败:', err));
  }, 60 * 1000);

  // 每天定时推送今日课表（每日检查是否到推送时间且未推送）
  const dailyTimer = setInterval(() => {
    const now = new Date();
    if (now.getHours() === DAILY_PUSH_TIME.hour && now.getMinutes() === DAILY_PUSH_TIME.minute) {
      void pushDailySchedule(userId).catch(err => console.error('[Push] 今日课表推送失败:', err));
    }
  }, 60 * 1000);

  // 防止定时器阻止进程退出
  minuteTimer.unref?.();
  dailyTimer.unref?.();
  console.log(`[Push] 课程推送调度已启动（开机补发 + 每日 ${DAILY_PUSH_TIME.hour}:${String(DAILY_PUSH_TIME.minute).padStart(2, '0')} + 上课前${CLASS_REMIND_MIN}分钟）`);
}