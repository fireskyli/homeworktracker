import { TaskWithStatus } from '../types';
import TaskItem from './TaskItem';

interface Props {
  tasks: TaskWithStatus[];
}

export default function TaskList({ tasks }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="text-5xl">🎉</span>
        <p className="text-gray-500 mt-4 text-lg">今天没有任务，休息一下吧！</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {tasks.map(task => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
}
