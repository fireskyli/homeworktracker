import { useApp } from '../App';

export default function StatsOverview() {
  const { stats } = useApp();

  if (!stats) return null;

  const cards = [
    { label: '今日完成率', value: `${stats.todayRate}%`, icon: '📊', color: 'bg-blue-500' },
    { label: '本周完成率', value: `${stats.weekRate}%`, icon: '📈', color: 'bg-green-500' },
    { label: '连续打卡', value: `${stats.currentStreak}天`, icon: '🔥', color: 'bg-orange-500' },
    { label: '总打卡次数', value: `${stats.totalCheckins}次`, icon: '✅', color: 'bg-purple-500' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {cards.map(card => (
        <div
          key={card.label}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-white w-8 h-8 rounded-lg ${card.color} flex items-center justify-center text-sm`}>
              {card.icon}
            </span>
            <span className="text-xs text-gray-500">{card.label}</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
