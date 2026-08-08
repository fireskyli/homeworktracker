import { useState } from 'react';
import { createSchedule, updateSchedule, deleteSchedule } from '../hooks/useSchedules';
import { ScheduleEntry } from '../types';

interface Props {
  editing?: ScheduleEntry | null;
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

const EMOJIS = ['📖', '🏫', '🧮', '🔤', '🎨', '🎹', '🏀', '🏊', '🩰', '♟️'];
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function ScheduleForm({ editing, defaultDate, onClose, onSaved, onDeleted }: Props) {
  const [name, setName] = useState(editing?.name || '');
  const [type, setType] = useState<'course' | 'tutoring'>(editing?.type || 'course');
  const [emoji, setEmoji] = useState(editing?.emoji || '📖');
  const [repeatType, setRepeatType] = useState<'weekly' | 'once'>(editing?.repeatType || 'weekly');
  const [repeatDays, setRepeatDays] = useState<number[]>(
    editing?.repeatDays?.length ? editing.repeatDays : [1, 2, 3, 4, 5]
  );
  const [date, setDate] = useState(editing?.date || defaultDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(editing?.startTime || '16:30');
  const [endTime, setEndTime] = useState(editing?.endTime || '18:00');
  const [location, setLocation] = useState(editing?.location || '');
  const [remindDayBefore, setRemindDayBefore] = useState(editing?.remindDayBefore ?? 1);
  const [remindMinBefore, setRemindMinBefore] = useState(editing?.remindMinBefore ?? 30);
  const [saving, setSaving] = useState(false);

  function toggleDay(day: number) {
    setRepeatDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !startTime) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        emoji,
        repeatType,
        repeatDays: repeatType === 'weekly' ? repeatDays : [],
        date: repeatType === 'once' ? date : undefined,
        startTime,
        endTime: endTime || startTime,
        location: location.trim() || undefined,
        remindDayBefore,
        remindMinBefore,
      };
      if (editing) await updateSchedule(editing.id, payload);
      else await createSchedule(payload);
      onSaved();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-bold mb-4">{editing ? '编辑课程' : '新增课程'}</h2>

        <label className="block mb-3">
          <span className="text-sm text-gray-600">课程名称</span>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="如：数学补习班"
            className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </label>

        <label className="block mb-3">
          <span className="text-sm text-gray-600">类型</span>
          <div className="flex gap-2 mt-1">
            {[
              { v: 'course' as const, l: '🏫 课程' },
              { v: 'tutoring' as const, l: '📚 补习班' },
            ].map(({ v, l }) => (
              <button
                key={v}
                type="button"
                onClick={() => setType(v)}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  type === v ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </label>

        <label className="block mb-3">
          <span className="text-sm text-gray-600">图标</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`text-2xl p-1.5 rounded-lg ${
                  emoji === e ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-50'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </label>

        <label className="block mb-3">
          <span className="text-sm text-gray-600">重复</span>
          <div className="flex gap-2 mt-1">
            {[
              { v: 'weekly' as const, l: '每周' },
              { v: 'once' as const, l: '单次' },
            ].map(({ v, l }) => (
              <button
                key={v}
                type="button"
                onClick={() => setRepeatType(v)}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  repeatType === v ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </label>

        {repeatType === 'weekly' && (
          <label className="block mb-3">
            <span className="text-sm text-gray-600">重复日期</span>
            <div className="flex gap-2 mt-1">
              {WEEKDAYS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`w-10 h-10 rounded-full text-sm ${
                    repeatDays.includes(i) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </label>
        )}

        {repeatType === 'once' && (
          <label className="block mb-3">
            <span className="text-sm text-gray-600">课程日期</span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        )}

        <div className="flex gap-3 mb-3">
          <label className="block flex-1">
            <span className="text-sm text-gray-600">开始时间</span>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="block flex-1">
            <span className="text-sm text-gray-600">结束时间</span>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>

        <label className="block mb-3">
          <span className="text-sm text-gray-600">地点（可选）</span>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="如：少年宫 3 楼"
            className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <div className="flex gap-3 mb-3">
          <label className="block flex-1">
            <span className="text-sm text-gray-600">提前提醒（天）</span>
            <input
              type="number"
              value={remindDayBefore}
              onChange={e => setRemindDayBefore(Number(e.target.value))}
              min={0}
              max={7}
              className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="block flex-1">
            <span className="text-sm text-gray-600">提前提醒（分钟）</span>
            <input
              type="number"
              value={remindMinBefore}
              onChange={e => setRemindMinBefore(Number(e.target.value))}
              min={0}
              max={1440}
              className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          {editing && (
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm(`删除「${editing.name}」？`)) return;
                try {
                  await deleteSchedule(editing.id);
                  onDeleted?.();
                } catch (err) {
                  alert((err as Error).message);
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-red-50 text-red-500 text-base font-medium"
            >
              删除
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-base font-medium"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white text-base font-medium disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}