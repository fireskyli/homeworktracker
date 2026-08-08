// ── 课程提醒计算（纯函数，便于单测）─────────────────────────
// 约定：
//   repeatType = "weekly" → repeatDays 为 JSON 数组 [1..7]（1=周一..7=周日）
//   repeatType = "once"   → date 为 YYYY-MM-DD
//   startTime / endTime   → "HH:mm"
//   提前1天提醒：课程开始前 remindDayBefore 天，且当天 20:00 触发，窗口持续到课程当天 00:00
//   提前N分钟提醒：课程开始前 remindMinBefore 分钟触发，窗口持续到课程开始

export type ReminderRule = {
  repeatType: string;
  repeatDays: string;
  date: string | null;
  startTime: string;
  remindDayBefore: number;
  remindMinBefore: number;
};

/** 将 "HH:mm" 解析为当天本地时刻 */
export function timeOfDay(dateStr: string, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(dateStr + 'T00:00:00');
  d.setHours(h, m, 0, 0);
  return d;
}

/** 解析 repeatDays JSON 数组，容错 */
export function parseRepeatDays(json: string): number[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.map(Number) : [];
  } catch {
    return [];
  }
}

/** 判断某天（YYYY-MM-DD）是否匹配该课程的重复规则 */
export function matchesDate(rule: ReminderRule, dateStr: string): boolean {
  if (rule.repeatType === 'weekly') {
    const d = new Date(dateStr + 'T00:00:00');
    return parseRepeatDays(rule.repeatDays).includes(d.getDay());
  }
  if (rule.repeatType === 'once') return rule.date === dateStr;
  return false;
}

/**
 * 计算 now 时刻该课程是否处于「提前1天」提醒窗口。
 * 窗口 = [课程日前N天 20:00, 课程当天 00:00)
 */
export function inDayBeforeWindow(rule: ReminderRule, now: Date, occ: Date): boolean {
  if (rule.remindDayBefore <= 0) return false;
  const trigger = new Date(occ);
  trigger.setDate(trigger.getDate() - rule.remindDayBefore);
  trigger.setHours(20, 0, 0, 0);
  const dayEnd = new Date(occ);
  dayEnd.setHours(0, 0, 0, 0);
  return now >= trigger && now < dayEnd;
}

/**
 * 计算 now 时刻该课程是否处于「提前N分钟」提醒窗口。
 * 窗口 = [开始前N分钟, 课程开始)
 */
export function inMinuteWindow(rule: ReminderRule, now: Date, occ: Date): boolean {
  if (rule.remindMinBefore <= 0) return false;
  const trigger = new Date(occ.getTime() - rule.remindMinBefore * 60 * 1000);
  return now >= trigger && now < occ;
}

/**
 * 计算 now 时刻应提醒的课程。
 * 遍历 now 前后各 lookBackDays/ lookForwardOcc 内的课程发生时间。
 * 返回 { occ, kind } 列表，kind ∈ "day" | "minute"。
 */
export function computeDueReminders(
  rules: ReminderRule[],
  now: Date,
  lookBackDays = 2,
  lookForwardOcc = 60,
): { occ: Date; kind: 'day' | 'minute'; rule: ReminderRule }[] {
  const due: { occ: Date; kind: 'day' | 'minute'; rule: ReminderRule }[] = [];

  for (const rule of rules) {
    // 若为单次课程且日期已远过，直接跳过
    if (rule.repeatType === 'once' && rule.date) {
      const occ = timeOfDay(rule.date, rule.startTime);
      // 检查是否落在任一窗口
      if (inDayBeforeWindow(rule, now, occ)) due.push({ occ, kind: 'day', rule });
      if (inMinuteWindow(rule, now, occ)) due.push({ occ, kind: 'minute', rule });
      continue;
    }

    // 周期性课程：从 now 前 lookBackDays 天开始扫描，找未来发生并在窗口内的
    const scanStart = new Date(now);
    scanStart.setDate(scanStart.getDate() - lookBackDays);
    scanStart.setHours(0, 0, 0, 0);

    let found = 0;
    for (let d = new Date(scanStart); found < lookForwardOcc; d.setDate(d.getDate() + 1)) {
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${mo}-${da}`;
      if (!matchesDate(rule, dateStr)) continue;

      const occ = timeOfDay(dateStr, rule.startTime);
      // 只考虑还没结束的课程（occ 在未来或正在进行）
      if (occ.getTime() + 24 * 3600 * 1000 < now.getTime()) continue;
      if (inDayBeforeWindow(rule, now, occ)) due.push({ occ, kind: 'day', rule });
      if (inMinuteWindow(rule, now, occ)) due.push({ occ, kind: 'minute', rule });
      found++;
    }
  }
  return due;
}
