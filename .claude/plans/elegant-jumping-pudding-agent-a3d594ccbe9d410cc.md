# Plan: Add Exercise Data to Weekly Report

## Summary
Add a new `/api/exercise-stats/weekly` backend endpoint and extend the weekly report frontend to display exercise data (运动次数、太阳数、按日明细、类型分布) alongside the existing homework data, reusing `getWeekDates` and the same `weekOffset` state.

---

## Step 1 – Backend: add `GET /api/exercise-stats/weekly`

**File:** `src/server/routes/exercise-stats.ts`

Add a new route at the end of the file (before the final blank line). Reuse the same Monday/Sunday calculation already used in `stats.ts` `/weekly`:

```typescript
// 周报数据（运动）
exerciseStatsRouter.get('/weekly', async (req, res) => {
  try {
    const now = new Date();
    const baseDate = req.query.date ? String(req.query.date) : now.toISOString().split('T')[0];
    const base = new Date(baseDate);

    const dayOfWeek = base.getDay() || 7;
    const monday = new Date(base);
    monday.setDate(base.getDate() - dayOfWeek + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const mondayStr = monday.toISOString().split('T')[0];
    const sundayStr = sunday.toISOString().split('T')[0];

    const exercises = await prisma.exercise.findMany({
      where: { date: { gte: mondayStr, lte: sundayStr } },
      include: { exerciseType: { select: { id: true, name: true, emoji: true, unit: true } } },
      orderBy: [{ date: 'asc' }, { completedAt: 'asc' }],
    });

    // 每日明细（7 天固定槽）
    const dailyBreakdown: Record<string, {
      date: string;
      count: number;
      suns: number;
      exercises: { id: number; name: string; emoji: string; quality: number | null; sets: string | null }[];
    }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const s = d.toISOString().split('T')[0];
      dailyBreakdown[s] = { date: s, count: 0, suns: 0, exercises: [] };
    }
    for (const e of exercises) {
      if (!dailyBreakdown[e.date]) continue;
      dailyBreakdown[e.date].count++;
      dailyBreakdown[e.date].suns += e.quality || 0;
      dailyBreakdown[e.date].exercises.push({
        id: e.id,
        name: e.exerciseType.name,
        emoji: e.exerciseType.emoji,
        quality: e.quality,
        sets: e.sets,
      });
    }

    // 类型分布
    const typeDist: Record<string, { name: string; emoji: string; count: number; suns: number }> = {};
    for (const e of exercises) {
      const key = String(e.exerciseTypeId);
      if (!typeDist[key]) typeDist[key] = { name: e.exerciseType.name, emoji: e.exerciseType.emoji, count: 0, suns: 0 };
      typeDist[key].count++;
      typeDist[key].suns += e.quality || 0;
    }

    const totalExercises = exercises.length;
    const totalSuns = exercises.reduce((s, e) => s + (e.quality || 0), 0);
    const exerciseDays = new Set(exercises.map(e => e.date)).size;
    const makeupCount = exercises.filter(e => e.isMakeup === 1).length;

    res.json({
      weekStart: mondayStr,
      weekEnd: sundayStr,
      totalExercises,
      totalSuns,
      exerciseDays,
      makeupCount,
      dailyBreakdown: Object.values(dailyBreakdown),
      typeDist: Object.values(typeDist),
    });
  } catch (err) {
    res.status(500).json({ error: '运动周报生成失败' });
  }
});
```

**Response shape (new type to add to frontend):**
```typescript
interface ExerciseWeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalExercises: number;
  totalSuns: number;
  exerciseDays: number;
  makeupCount: number;
  dailyBreakdown: {
    date: string;
    count: number;
    suns: number;
    exercises: { id: number; name: string; emoji: string; quality: number | null; sets: string | null }[];
  }[];
  typeDist: { name: string; emoji: string; count: number; suns: number }[];
}
```

No DB schema changes needed — we only read from existing `Exercise` and `ExerciseType` tables.

---

## Step 2 – Frontend: add `fetchExerciseWeekly` hook

**File:** `src/client/hooks/useExerciseStats.ts`

Append at the end of the file:

```typescript
import type { ExerciseWeeklyReport } from '../types';

export async function fetchExerciseWeekly(date?: string): Promise<ExerciseWeeklyReport> {
  const sp = new URLSearchParams();
  if (date) sp.set('date', date);
  const res = await fetch(`${API}/weekly?${sp}`);
  if (!res.ok) throw new Error('获取运动周报失败');
  return res.json();
}
```

Also add the `ExerciseWeeklyReport` type to `src/client/types/index.ts` (Step 3 below) so the import resolves.

---

## Step 3 – Frontend: extend types

**File:** `src/client/types/index.ts`

Add a new interface at the end of the file (before the final blank line):

```typescript
export interface ExerciseWeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalExercises: number;
  totalSuns: number;
  exerciseDays: number;
  makeupCount: number;
  dailyBreakdown: {
    date: string;
    count: number;
    suns: number;
    exercises: { id: number; name: string; emoji: string; quality: number | null; sets: string | null }[];
  }[];
  typeDist: { name: string; emoji: string; count: number; suns: number }[];
}
```

No change to the existing `WeeklyReport` interface (keeping them separate is cleaner — the page can show both side by side).

---

## Step 4 – Frontend: update `WeeklyReportPage.tsx`

**File:** `src/client/pages/WeeklyReportPage.tsx`

### 4a. New imports
Add to the existing import block:
```typescript
import { fetchExerciseWeekly } from '../hooks/useExerciseStats';
import type { ExerciseWeeklyReport } from '../types';
```

### 4b. New state
Inside the component, alongside the existing `report` state:
```typescript
const [exerciseReport, setExerciseReport] = useState<ExerciseWeeklyReport | null>(null);
```

### 4c. Update `loadReport`
After the existing `fetchWeeklyReport` call, fetch exercise data for the same week:
```typescript
async function loadReport() {
  try {
    setLoading(true);
    setError('');
    const targetDate = getWeekDates(weekOffset).monday;
    const [data, exData] = await Promise.all([
      fetchWeeklyReport(targetDate),
      fetchExerciseWeekly(targetDate),
    ]);
    setReport(data);
    setExerciseReport(exData);
  } catch (err) {
    setError((err as Error).message);
  } finally {
    setLoading(false);
  }
}
```

### 4d. New exercise section (insert after the existing "其他统计" section, before the closing `</div>`)

```tsx
      {/* 运动数据 */}
      {(exerciseReport?.totalExercises ?? 0) > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-sm font-medium text-gray-600 mb-3">🏃 本周运动</h2>

          {/* 运动概览卡片 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <div className="text-xs text-orange-600 mb-1">本周运动次数</div>
              <p className="text-2xl font-bold text-orange-600">{exerciseReport.totalExercises}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <div className="text-xs text-yellow-600 mb-1">本周获得太阳</div>
              <p className="text-2xl font-bold text-yellow-600">☀️ {exerciseReport.totalSuns}</p>
            </div>
          </div>

          {/* 每日运动明细 */}
          <div className="flex flex-col gap-2">
            {exerciseReport.dailyBreakdown.filter(d => d.count > 0).map(day => (
              <div key={day.date} className="border-t border-gray-50 pt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-500">
                    {new Date(day.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short'
