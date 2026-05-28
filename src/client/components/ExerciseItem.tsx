import { Exercise } from '../types';
import SunStars from './SunStars';

interface Props {
  exercise: Exercise;
  onDelete?: (id: number) => void;
}

export default function ExerciseItem({ exercise, onDelete }: Props) {
  const type = exercise.exerciseType;
  const sets = exercise.sets || [];

  function formatSets(unit: string): string {
    if (sets.length === 0) return '';
    if (sets.length === 1) {
      const s = sets[0];
      if (s.count === 1) return `${s.reps} ${unit}`;
      return `${s.count}组 × ${s.reps}${unit}`;
    }
    return sets.map(s => `${s.count}×${s.reps}${unit}`).join('、');
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{type?.emoji || '🏃'}</span>
          <div>
            <h3 className="font-medium text-base text-gray-800">{type?.name || '运动'}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {sets.length > 0 && (
                <span className="text-xs text-gray-500">
                  {formatSets(type?.unit || '次')}
                </span>
              )}
              {exercise.isMakeup === 1 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                  🔙 补卡
                </span>
              )}
              {exercise.note && (
                <span className="text-xs text-gray-400">📝 {exercise.note}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <SunStars value={exercise.quality} readonly />
          {exercise.quality && (
            <span className="text-xs text-amber-500">+{exercise.quality} 🏆</span>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(exercise.id)}
              className="text-red-400 text-xs mt-1"
            >
              删除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
