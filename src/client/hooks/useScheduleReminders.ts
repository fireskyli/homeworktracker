import { useEffect, useRef } from 'react';
import { fetchDueReminders, ScheduleReminder } from './useSchedules';

const POLL_INTERVAL = 60_000; // 60 秒轮询一次
const STORAGE_KEY = 'scheduleRemindersNotified';

/** 读取已提醒记录 Set，key = `${scheduleId}:${occ}`
 *  localStorage 存 JSON 数组，清理超过 7 天的旧记录 */
function loadNotified(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
}

function saveNotified(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

function requestPermission(): Promise<string> {
  if (!('Notification' in window)) return Promise.resolve('unsupported');
  if (Notification.permission === 'default') {
    return Notification.requestPermission();
  }
  return Promise.resolve(Notification.permission);
}

function showNotification(reminder: ScheduleReminder) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const title = reminder.kind === 'day'
    ? `⏰ 明天有课程`
    : `🔔 即将开始`;
  const body =
    `${reminder.emoji} ${reminder.name} ${reminder.startTime}` +
    (reminder.location ? ` @ ${reminder.location}` : '') +
    (reminder.kind === 'day' ? '（明天）' : '（即将开始）');
  try {
    new Notification(title, { body, icon: '/favicon.svg' });
  } catch {
    /* 某些环境不支持 icon */
    new Notification(title, { body });
  }
}

/** 全局课程提醒：每 60 秒轮询提醒接口，浏览器通知 + 站内横幅去重 */
export function useScheduleReminders(onBanner: (r: ScheduleReminder) => void) {
  const seenRef = useRef<Set<string>>(loadNotified());
  const bannerRef = useRef(onBanner);
  bannerRef.current = onBanner;

  useEffect(() => {
    // 首次进入请求通知权限（用户触发上下文可能受限，静默尝试）
    requestPermission();

    let cancelled = false;

    async function poll() {
      try {
        const reminders = await fetchDueReminders();
        for (const r of reminders) {
          const key = `${r.scheduleId}:${r.occ}`;
          if (seenRef.current.has(key)) continue;
          seenRef.current.add(key);
          showNotification(r);
          bannerRef.current?.(r);
        }
        saveNotified(seenRef.current);
      } catch (err) {
        console.error('轮询课程提醒失败:', err);
      }
    }

    poll();
    const timer = setInterval(poll, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
}