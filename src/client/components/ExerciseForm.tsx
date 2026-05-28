import { useState } from 'react';
import { ExerciseType, ExerciseSet } from '../types';
import SunStars from './SunStars';

interface Props {
  exerciseType: ExerciseType;
  onSaved: (data: { exerciseTypeId: number; quality: number; sets: ExerciseSet[]; note: string }) => Promise<void>;
  onClose: () => void;
  isMakeup?: boolean;
  makeupDate?: string;
}

export default function ExerciseForm({ exerciseType, onSaved, onClose }: Props) {
  const [quality, setQuality] = useState<number | null>(null);
  const [sets, setSets] = useState<ExerciseSet[]>([{ count: 1, reps: 0 }]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function addSet() {
    setSets(prev => [...prev, { count: 1, reps: 0 }]);
  }

  function removeSet(index: number) {
    setSets(prev => prev.filter((_, i) => i !== index));
  }

  function updateSet(index: number, field: 'count' | 'reps', value: number) {
    setSets(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quality) {
      setError('请选择完成质量（太阳数）');
      return;
    }
    const validSets = sets.filter(s => s.count > 0 && s.reps > 0);
    if (validSets.length === 0) {
      setError('请至少填写一组有效的运动数据');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSaved({
        exerciseTypeId: exerciseType.id,
        quality,
        sets: validSets,
        note: note.trim() || '',
      });
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{exerciseType.emoji}</span>
          <div>
            <h2 className="text-lg font-bold">{exerciseType.name}</h2>
            <span className="text-xs text-gray-400">单位：{exerciseType.unit}</span>
          </div>
        </div>

        {/* 组数 × 次数 */}
        <label className="block mb-4">
          <span className="text-sm text-gray-600 mb-2 block">运动数据</span>
          <div className="flex flex-col gap-2">
            {sets.map((set, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-6">第{i + 1}组</span>
                <div className="flex items-center gap-1 flex-1">
                  <input
                    type="number"
                    min={1}
                    value={set.count}
                    onChange={e => updateSet(i, 'count', Number(e.target.value))}
                    className="w-20 px-2 py-2 border border-gray-200 rounded-lg text-base text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="组数"
                  />
                  <span className="text-sm text-gray-400">组 × </span>
                  <input
                    type="number"
                    min={1}
                    value={set.reps}
                    onChange={e => updateSet(i, 'reps', Number(e.target.value))}
                    className="w-24 px-2 py-2 border border-gray-200 rounded-lg text-base text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder={exerciseType.unit}
                  />
                  <span className="text-sm text-gray-400">{exerciseType.unit}</span>
                </div>
                {sets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSet(i)}
                    className="w-8 h-8 text-red-400 text-lg"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addSet}
            className="mt-2 text-sm text-orange-500 font-medium"
          >
            + 添加一组
          </button>
        </label>

        {/* 太阳评级 */}
        <label className="block mb-4">
          <span className="text-sm text-gray-600 mb-2 block">完成质量</span>
          <SunStars value={quality} onChange={setQuality} />
        </label>

        {/* 备注 */}
        <label className="block mb-4">
          <span className="text-sm text-gray-600 mb-1 block">备注（可选）</span>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="如：今天状态很好"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </label>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <div className="flex gap-3 mt-4">
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
            className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-base font-medium disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}
