import { Router } from 'express';
import { prisma } from '../db';

export const scheduleAttendanceRouter = Router();

// -- 辅助：解析 repeatDays --
function parseRepeatDays(json: string): number[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// -- 辅助：判断课程在某天是否发生 --
function entryOccursOn(entry: { repeatType: string; repeatDays: string; date: string | null }, dateStr: string): boolean {
  if (entry.repeatType === 'weekly') {
    const d = new Date(dateStr + 'T00:00:00');
    return parseRepeatDays(entry.repeatDays).includes(d.getDay());
  }
  return entry.date === dateStr;
}

// -- 辅助：补零 --
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// 获取日期范围内的出勤记录
scheduleAttendanceRouter.get('/attendance', async (req, res) => {
  try {
    const startDate = String(req.query.startDate || '');
    const endDate = String(req.query.endDate || '');

    const where: Record<string, unknown> = { userId: req.userId };
    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    } else if (startDate) {
      where.date = { gte: startDate };
    } else if (endDate) {
      where.date = { lte: endDate };
    }

    const records = await prisma.scheduleAttendance.findMany({ where });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: '获取出勤记录失败' });
  }
});

// 创建或更新出勤记录
scheduleAttendanceRouter.post('/:id/attendance', async (req, res) => {
  try {
    const scheduleId = Number(req.params.id);
    const { date, status, note } = req.body as { date: string; status: string; note?: string };

    if (!date || !status) {
      return res.status(400).json({ error: '日期和状态必填' });
    }
    if (!['attended', 'makeup', 'absent'].includes(status)) {
      return res.status(400).json({ error: '状态无效' });
    }

    // 确认课程属于当前用户
    const entry = await prisma.scheduleEntry.findFirst({
      where: { id: scheduleId, userId: req.userId },
    });
    if (!entry) {
      return res.status(404).json({ error: '课程不存在' });
    }

    const now = new Date().toISOString();
    const record = await prisma.scheduleAttendance.upsert({
      where: { scheduleId_date: { scheduleId, date } },
      update: { status, note: note ?? null, updatedAt: now },
      create: { scheduleId, date, status, note: note ?? null, userId: req.userId, createdAt: now, updatedAt: now },
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: '保存出勤记录失败' });
  }
});

// 删除出勤记录（恢复为自动判定）
scheduleAttendanceRouter.delete('/:id/attendance', async (req, res) => {
  try {
    const scheduleId = Number(req.params.id);
    const date = String(req.query.date || '');
    if (!date) {
      return res.status(400).json({ error: '日期参数必填' });
    }

    await prisma.scheduleAttendance.deleteMany({
      where: { scheduleId, date, userId: req.userId },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: '删除出勤记录失败' });
  }
});

// 月度出勤统计
scheduleAttendanceRouter.get('/attendance/stats', async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1; // 1-12

    // 计算月份起止日期
    const startDate = `${year}-${pad(month)}-01`;
    const endDate = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    // 获取所有活跃课程
    const entries = await prisma.scheduleEntry.findMany({
      where: { isActive: 1, userId: req.userId },
    });

    // 获取该月出勤记录
    const attendances = await prisma.scheduleAttendance.findMany({
      where: { userId: req.userId, date: { gte: startDate, lte: endDate } },
    });

    // 建立 lookup map: scheduleId -> date -> status
    const attendanceMap = new Map<number, Map<string, string>>();
    for (const a of attendances) {
      if (!attendanceMap.has(a.scheduleId)) {
        attendanceMap.set(a.scheduleId, new Map());
      }
      attendanceMap.get(a.scheduleId)!.set(a.date, a.status);
    }

    // 逐门课统计
    const stats = entries.map(entry => {
      let total = 0;
      let attended = 0;
      let makeup = 0;
      let absent = 0;

      // 遍历该月每一天
      const d = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0).getDate();
      for (let day = 1; day <= lastDay; day++) {
        const ds = `${year}-${pad(month)}-${pad(day)}`;
        if (!entryOccursOn(entry, ds)) continue;

        // 未来日期不参与统计
        if (ds > todayStr) continue;

        total++;
        const status = attendanceMap.get(entry.id)?.get(ds);
        if (status === 'attended') attended++;
        else if (status === 'makeup') makeup++;
        else absent++; // 无记录或显式缺席
      }

      const rate = total > 0 ? Math.round(((attended + makeup) / total) * 100) : 0;

      return {
        scheduleId: entry.id,
        name: entry.name,
        emoji: entry.emoji,
        type: entry.type,
        total,
        attended,
        makeup,
        absent,
        rate,
      };
    });

    // 只返回有课程发生（total > 0）的条目
    res.json(stats.filter(s => s.total > 0));
  } catch (err) {
    res.status(500).json({ error: '统计失败' });
  }
});
