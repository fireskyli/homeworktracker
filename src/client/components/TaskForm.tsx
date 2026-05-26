import { useState } from 'react';
import { createTask, updateTask } from '../hooks/useTasks';
import { Task } from '../types';

interface Props {
  editingTask?: Task | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMOJIS = ['📖', '🔢', '🔬', '🎨', '🎵', '📚', '✏️', '🗺️', '💻', '🏃'];
const SUBJECTS = ['语文', '数学', '英语', '科学', '其他'];
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function TaskForm({ editingTask, onClose, onSaved }: Props) {
  const [name, setName] = useState(editingTask?.name || '');
  const [subject, setSubject] = useState(editingTask?.subject || '语文');
  const [emoji, setEmoji] = useState(editingTask?.emoji || '📚');
  const [estimatedMin, setEstimatedMin] = useState(editingTask?.estimatedMin || 10);
  const [deadlineTime, setDeadlineTime] = useState(editingTask?.deadlineTime || '');
  const [repeatType, setRepeatType] = useState<'once' | 'daily' | 'weekly'>(
    (editingTask?.repeatType as 'once' | 'daily' | 'weekly') || 'daily'
  );
  const [startDate, setStartDate] = useState(
    editingTask?.startDate || new Date().toISOString().split('T')[0]
  );
  const [repeatDays, setRepeatDays] = useState<number[]>(
    editingTask?.repeatDays?.length ? editingTask.repeatDays : [1, 2, 3, 4, 5]
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          name: name.trim(),
          subject,
          emoji,
          estimatedMin,
          deadlineTime: deadlineTime || undefined,
          repeatType,
          startDate: repeatType === 'once' ? startDate : undefined,
          repeatDays: repeatType === 'weekly' ? repeatDays : [],
        });
      } else {
        await createTask({
          name: name.trim(),
          subject,
          emoji,
          estimatedMin,
          deadlineTime: deadlineTime || undefined,
          repeatType,
          startDate: repeatType === 'once' ? startDate : undefined,
          repeatDays: repeatType === 'weekly' ? repeatDays : [],
        });
      }
      onSaved();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function toggleDay(day: number) {
    setRepeatDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-bold mb-4">
          {editingTask ? '编辑任务' : '新建任务'}
        </h2>

        {/* 任务名 */}
        <label className="block mb-3">
          <span className="text-sm text-gray-600">任务名称</span>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="如：数学口算"
            className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </label>

        {/* Emoji 选择 */}
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

        {/* 科目 */}
        <label className="block mb-3">
          <span className="text-sm text-gray-600">科目</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {SUBJECTS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSubject(s)}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  subject === s
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </label>

        {/* 预计时长 */}
        <label className="block mb-3">
          <span className="text-sm text-gray-600">预计时长（分钟）</span>
          <input
            type="number"
            value={estimatedMin}
            onChange={e => setEstimatedMin(Number(e.target.value))}
            min={1}
            max={120}
            className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        {/* 截止时间 */}
        <label className="block mb-3">
          <span className="text-sm text-gray-600">截止时间（可选）</span>
          <input
            type="time"
            value={deadlineTime}
            onChange={e => setDeadlineTime(e.target.value)}
            className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        {/* 重复类型 */}
        <label className="block mb-3">
          <span className="text-sm text-gray-600">重复</span>
          <div className="flex gap-2 mt-1">
            {[
              { v: 'once' as const, l: '一次性' },
              { v: 'daily' as const, l: '每天' },
              { v: 'weekly' as const, l: '每周' },
            ].map(({ v, l }) => (
              <button
                key={v}
                type="button"
                onClick={() => setRepeatType(v)}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  repeatType === v
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </label>

        {/* 一次性任务：选择日期 */}
        {repeatType === 'once' && (
          <label className="block mb-3">
            <span className="text-sm text-gray-600">任务日期</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        )}

        {/* 每周重复天数 */}
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
                    repeatDays.includes(i)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </label>
        )}

        {/* 按钮 */}
        <div className="flex gap-3 mt-6">
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
