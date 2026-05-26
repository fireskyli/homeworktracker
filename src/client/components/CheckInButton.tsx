import { useState } from 'react';
import { useApp } from '../App';
import { checkIn } from '../hooks/useCheckins';
import QualityStars from './QualityStars';

interface Props {
  taskId: number;
  isCheckedIn: boolean;
  quality: number | null;
}

export default function CheckInButton({ taskId, isCheckedIn, quality }: Props) {
  const { refreshData } = useApp();
  const [showStars, setShowStars] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<number | null>(quality);
  const [animating, setAnimating] = useState(false);
  const [error, setError] = useState('');

  async function handleCheckIn() {
    if (isCheckedIn) return;

    if (!showStars) {
      setShowStars(true);
      return;
    }

    try {
      setAnimating(true);
      await checkIn(taskId, selectedQuality || undefined);
      await refreshData();
      setShowStars(false);
      setTimeout(() => setAnimating(false), 600);
    } catch (err: unknown) {
      setError((err as Error).message);
      setAnimating(false);
    }
  }

  if (isCheckedIn) {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="text-green-500 font-medium text-base">✅ 已完成</span>
        {quality && <QualityStars value={quality} readonly />}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {showStars && (
        <div className="flex items-center gap-3 bg-yellow-50 px-3 py-2 rounded-lg animate-bounce-in">
          <span className="text-sm text-gray-600">完成质量：</span>
          <QualityStars value={selectedQuality} onChange={setSelectedQuality} />
        </div>
      )}
      <button
        onClick={handleCheckIn}
        className={`px-5 py-2.5 rounded-xl font-medium text-base transition-all ${
          animating
            ? 'bg-green-500 text-white scale-110'
            : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
        }`}
      >
        {showStars ? '确认完成 ✓' : '完成 ✓'}
      </button>
      {showStars && (
        <button
          onClick={() => setShowStars(false)}
          className="text-sm text-gray-400"
        >
          取消
        </button>
      )}
      {error && <span className="text-red-500 text-sm">{error}</span>}
    </div>
  );
}
