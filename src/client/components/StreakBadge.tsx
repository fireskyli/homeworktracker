import { useApp } from '../App';

export default function StreakBadge() {
  const { streak } = useApp();

  if (!streak || streak.current === 0) return null;

  return (
    <div className="flex items-center gap-1 bg-orange-100 text-orange-600 px-3 py-1.5 rounded-full text-sm font-medium">
      <span>🔥</span>
      <span>连续 {streak.current} 天</span>
    </div>
  );
}
