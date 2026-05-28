import { TaskWithStatus } from '../types';
import CheckInButton from './CheckInButton';

interface Props {
  task: TaskWithStatus;
}

const subjectColors: Record<string, string> = {
  语文: 'bg-red-100 text-red-600',
  数学: 'bg-blue-100 text-blue-600',
  英语: 'bg-green-100 text-green-600',
  科学: 'bg-purple-100 text-purple-600',
  其他: 'bg-gray-100 text-gray-600',
};

export default function TaskItem({ task }: Props) {
  const color = subjectColors[task.subject] || subjectColors['其他'];

  return (
    <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{task.emoji}</span>
        <div>
          <h3 className="font-medium text-base text-gray-800">{task.name}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>
              {task.subject}
            </span>
            {task.estimatedMin > 0 && (
              <span className="text-xs text-gray-400">⏱ {task.estimatedMin}分钟</span>
            )}
            {task.isMakeup === 1 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                🔙 补打卡
              </span>
            )}
            {task.overdueDays > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                ⏰ 已顺延 {task.overdueDays} 天
              </span>
            )}
          </div>
        </div>
      </div>
      <CheckInButton
        taskId={task.id}
        isCheckedIn={task.isCheckedIn}
        quality={task.quality}
        photoUrl={task.photoUrl}
      />
    </div>
  );
}
