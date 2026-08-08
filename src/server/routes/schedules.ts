import { Router } from 'express';
import { prisma } from '../db';
import { computeDueReminders, ReminderRule } from '../schedule-reminders';

export const scheduleRouter = Router();

// ── 工具：解析/序列化 repeatDays ──────────────────────────
function parseRepeatDays(json: string): number[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function serializeSchedule(s: {
  repeatDays: string | null;
  [k: string]: unknown;
}) {
  return { ...s, repeatDays: parseRepeatDays(s.repeatDays ?? '[]') };
}

// 获取所有活跃课程
scheduleRouter.get('/', async (req, res) => {
  try {
    const schedules = await prisma.scheduleEntry.findMany({
      where: { isActive: 1, userId: req.userId },
      orderBy: [{ startTime: 'asc' }],
    });
    res.json(schedules.map(serializeSchedule));
  } catch (err) {
    res.status(500).json({ error: '获取课程失败' });
  }
});

// 获取单个课程
scheduleRouter.get('/:id', async (req, res) => {
  try {
    const s = await prisma.scheduleEntry.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    if (!s) return res.status(404).json({ error: '课程不存在' });
    res.json(serializeSchedule(s));
  } catch (err) {
    res.status(500).json({ error: '获取课程失败' });
  }
});

// 创建课程
scheduleRouter.post('/', async (req, res) => {
  try {
    const { name, type, emoji, repeatType, repeatDays, date, startTime, endTime, location, remindDayBefore, remindMinBefore } = req.body;
    if (!name || !startTime) return res.status(400).json({ error: '课程名和开始时间必填' });

    const now = new Date().toISOString();
    const s = await prisma.scheduleEntry.create({
      data: {
        name,
        type: type || 'course',
        emoji: emoji || '📖',
        repeatType: repeatType || 'weekly',
        repeatDays: JSON.stringify(repeatDays || []),
        date: date || null,
        startTime,
        endTime: endTime || startTime,
        location: location || null,
        remindDayBefore: remindDayBefore ?? 1,
        remindMinBefore: remindMinBefore ?? 30,
        userId: req.userId,
        createdAt: now,
        updatedAt: now,
      },
    });
    res.status(201).json(serializeSchedule(s));
  } catch (err) {
    res.status(500).json({ error: '创建课程失败' });
  }
});

// 更新课程
scheduleRouter.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, type, emoji, repeatType, repeatDays, date, startTime, endTime, location, remindDayBefore, remindMinBefore, isActive } = req.body;

    const data: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (name !== undefined) data.name = name;
    if (type !== undefined) data.type = type;
    if (emoji !== undefined) data.emoji = emoji;
    if (repeatType !== undefined) data.repeatType = repeatType;
    if (repeatDays !== undefined) data.repeatDays = JSON.stringify(repeatDays);
    if (date !== undefined) data.date = date;
    if (startTime !== undefined) data.startTime = startTime;
    if (endTime !== undefined) data.endTime = endTime;
    if (location !== undefined) data.location = location;
    if (remindDayBefore !== undefined) data.remindDayBefore = remindDayBefore;
    if (remindMinBefore !== undefined) data.remindMinBefore = remindMinBefore;
    if (isActive !== undefined) data.isActive = isActive ? 1 : 0;

    const s = await prisma.scheduleEntry.update({ where: { id, userId: req.userId }, data });
    res.json(serializeSchedule(s));
  } catch (err) {
    res.status(500).json({ error: '更新课程失败' });
  }
});

// 软删除课程
scheduleRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.scheduleEntry.update({
      where: { id: Number(req.params.id), userId: req.userId },
      data: { isActive: 0, updatedAt: new Date().toISOString() },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: '删除课程失败' });
  }
});

/** 匹配某课程在 occ 日期是否有发生（用于反查提醒对应的课程） */
function matchesOccurrence(s: { repeatType: string; repeatDays: string; date: string | null; startTime: string }, occ: Date): boolean {
  const occStr = `${occ.getFullYear()}-${String(occ.getMonth() + 1).padStart(2, '0')}-${String(occ.getDate()).padStart(2, '0')}`;
  if (s.repeatType === 'weekly') {
    return parseRepeatDays(s.repeatDays).includes(occ.getDay());
  }
  return s.date === occStr;
}

// 提醒接口：返回当前应触发的提醒
scheduleRouter.get('/reminders/now', async (req, res) => {
  try {
    const schedules = await prisma.scheduleEntry.findMany({
      where: { isActive: 1, userId: req.userId },
    });
    const rules: ReminderRule[] = schedules.map(s => ({
      repeatType: s.repeatType,
      repeatDays: s.repeatDays,
      date: s.date,
      startTime: s.startTime,
      remindDayBefore: s.remindDayBefore,
      remindMinBefore: s.remindMinBefore,
    }));

    const now = new Date();
    const due = computeDueReminders(rules, now);

    const result = due.map(d => {
      const entry = schedules.find(s => matchesOccurrence(s, d.occ));
      return {
        scheduleId: entry?.id ?? null,
        name: entry?.name ?? '课程',
        emoji: entry?.emoji ?? '📖',
        type: entry?.type ?? 'course',
        startTime: entry?.startTime ?? '',
        location: entry?.location ?? '',
        occ: d.occ.toISOString(),
        kind: d.kind,
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: '获取提醒失败' });
  }
});
