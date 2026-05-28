import { Link } from 'react-router-dom';
import { useApp } from '../App';
import TaskList from '../components/TaskList';
import StreakBadge from '../components/StreakBadge';

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

export default function HomePage() {
  const { tasks, pointsBalance } = useApp();
  const now = new Date();
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日 ${WEEKDAYS[now.getDay()]}`;

  return (
    <div className="p-4">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">{dateStr}</h1>
        <StreakBadge />
      </div>

      {/* 积分余额 */}
      <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-xl p-4 mb-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-90">当前积分</div>
            <div className="text-3xl font-bold mt-1">🏆 {pointsBalance}</div>
          </div>
          <span className="text-4xl">⭐</span>
        </div>
      </div>

      {/* 进度 */}
      <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>今日进度</span>
          <span>
            {tasks.filter(t => t.isCheckedIn).length}/{tasks.length}
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{
              width: tasks.length > 0
                ? `${(tasks.filter(t => t.isCheckedIn).length / tasks.length) * 100}%`
                : '0%',
            }}
          />
        </div>
      </div>

      {/* 任务列表 */}
      <TaskList tasks={tasks} />

      {/* 补打卡入口 */}
      <Link
        to="/makeup"
        className="flex items-center justify-center gap-2 mt-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-600 font-medium text-sm hover:bg-orange-100 transition-colors"
      >
        <span>🔙</span>
        <span>补打卡 — 补上之前漏掉的任务</span>
      </Link>
    </div>
  );
}
