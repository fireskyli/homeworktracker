import { useApp } from '../App';
import TaskList from '../components/TaskList';
import StreakBadge from '../components/StreakBadge';

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

export default function HomePage() {
  const { tasks } = useApp();
  const now = new Date();
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日 ${WEEKDAYS[now.getDay()]}`;

  return (
    <div className="p-4">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">{dateStr}</h1>
        <StreakBadge />
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
    </div>
  );
}
