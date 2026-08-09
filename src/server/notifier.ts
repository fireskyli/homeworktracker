// ── 钉钉群机器人推送服务 ──────────────────────────
// 使用钉钉「自定义机器人」webhook 发送消息。
// webhook 格式: https://oapi.dingtalk.com/robot/send?access_token=xxx

const DINGTALK_WEBHOOK_PREFIX = 'https://oapi.dingtalk.com/robot/send?access_token=';

// 钉钉自定义机器人「自定义关键词」安全校验要求：每条消息必须包含此关键词
const KEYWORD = '励夏的课程';

/** 校验 webhook 地址是否合法（钉钉机器人格式） */
export function isValidDingtalkWebhook(url: string): boolean {
  return typeof url === 'string' && url.startsWith(DINGTALK_WEBHOOK_PREFIX) && url.length > DINGTALK_WEBHOOK_PREFIX.length;
}

/** 发送钉钉 Markdown 消息。返回成功与否。 */
export async function sendDingtalkMarkdown(
  webhook: string,
  title: string,
  markdown: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidDingtalkWebhook(webhook)) {
    return { ok: false, error: '无效的钉钉 webhook 地址' };
  }
  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: { title, text: markdown },
      }),
    });
    const data = await res.json().catch(() => ({ errcode: -1, errmsg: '无法解析响应' })) as { errcode: number; errmsg?: string };
    if (data.errcode === 0) return { ok: true };
    return { ok: false, error: data.errmsg || `钉钉返回错误 ${data.errcode}` };
  } catch (err) {
    return { ok: false, error: `网络错误: ${(err as Error).message}` };
  }
}

/** 生成今日课表 Markdown 文本（含钉钉关键词） */
export function buildTodayScheduleMarkdown(
  items: { name: string; emoji: string; startTime: string; endTime: string; location: string | null; appName: string | null }[]
): string {
  if (items.length === 0) {
    return `#### 📅 今日课表 · ${KEYWORD}\n\n今天没有课程，好好休息！`;
  }
  const lines = [`#### 📅 今日课表 · ${KEYWORD}`, ''];
  items.forEach((it, i) => {
    const place = it.appName ? `【${it.appName}】` : it.location ? `📍${it.location}` : '';
    lines.push(`${i + 1}. ${it.emoji} **${it.name}** ${it.startTime}-${it.endTime} ${place}`);
  });
  return lines.join('\n');
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 生成未来 N 天课程总览 Markdown 文本（含钉钉关键词） */
export function buildWeeklyScheduleMarkdown(
  entries: { name: string; emoji: string; startTime: string; endTime: string; location: string | null; appName: string | null; repeatType: string; repeatDays: string; date: string | null }[],
  startDate: Date,
  days = 7
): string {
  const lines = [`#### 📅 未来${days}天课程总览 · ${KEYWORD}`, ''];

  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const year = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${mo}-${da}`;
    const weekday = WEEKDAYS[d.getDay()];

    // 找出当天课程
    const dayItems = entries.filter(e => {
      const dd = new Date(dateStr + 'T00:00:00');
      if (e.repeatType === 'weekly') {
        try { return JSON.parse(e.repeatDays).includes(dd.getDay()); } catch { return false; }
      }
      return e.date === dateStr;
    }).map(e => ({
      name: e.name, emoji: e.emoji, startTime: e.startTime, endTime: e.endTime,
      location: e.location, appName: e.appName,
    }));

    if (i > 0) lines.push('---');
    lines.push(`**${weekday} ${mo}/${da}**`);

    if (dayItems.length === 0) {
      lines.push('（无课程）');
    } else {
      dayItems.forEach(it => {
        const place = it.appName ? `【${it.appName}】` : it.location ? `📍${it.location}` : '';
        lines.push(`${it.emoji} **${it.name}** ${it.startTime}-${it.endTime} ${place}`);
      });
    }
    lines.push('');
  }
  return lines.join('\n');
}

/** 生成上课前提醒 Markdown 文本（含钉钉关键词） */
export function buildClassReminderMarkdown(
  item: { name: string; emoji: string; startTime: string; endTime: string; location: string | null; appName: string | null }
): string {
  const place = item.appName ? `【${item.appName}】` : item.location ? `📍${item.location}` : '';
  return `### ⏰ 上课提醒 · ${KEYWORD}\n\n${item.emoji} **${item.name}** 将在 ${item.startTime} 开始（${item.endTime} 结束）\n\n${place}`;
}