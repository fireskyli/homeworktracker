import { useState } from 'react';
import { useApp } from '../App';
import { deleteTask, updateTask } from '../hooks/useTasks';
import { Task } from '../types';
import TaskForm from '../components/TaskForm';

const subjectColors: Record<string, string> = {
  语文: 'bg-red-100 text-red-600',
  数学: 'bg-blue-100 text-blue-600',
  英语: 'bg-green-100 text-green-600',
  科学: 'bg-purple-100 text-purple-600',
  其他: 'bg-gray-100 text-gray-600',
};

const repeatLabels: Record<string, string> = {
  once: '一次性',
  daily: '每天',
  weekly: '每周',
};

const TEMPLATES = [
  { name: '语文朗读', subject: '语文', emoji: '📖', estimatedMin: 10, repeatType: 'daily' as const, startDate: undefined as string | undefined },
  { name: '数学口算', subject: '数学', emoji: '🔢', estimatedMin: 10, repeatType: 'daily' as const, startDate: undefined as string | undefined },
  { name: '英语背诵', subject: '英语', emoji: '📝', estimatedMin: 15, repeatType: 'daily' as const, startDate: undefined as string | undefined },
];

export default function TasksPage() {
  const { allTasks, refreshData, isParentMode, setParentMode } = useApp();
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  async function handleVerifyPassword() {
    try {
      const res = await fetch('/api/settings/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setParentMode(true);
        localStorage.setItem('parentMode', 'true');
        setPasswordError('');
      } else {
        setPasswordError('密码错误');
      }
    } catch {
      setPasswordError('验证失败');
    }
  }

  // 未验证密码
  if (!isParentMode) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
        <span className="text-5xl mb-4">🔒</span>
        <h2 className="text-lg font-bold mb-4">家长验证</h2>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()}
          placeholder="请输入家长密码"
          className="w-full max-w-xs px-4 py-2.5 border border-gray-200 rounded-lg text-base text-center focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
        />
        {passwordError && (
          <p className="text-red-500 text-sm mb-3">{passwordError}</p>
        )}
        <button
          onClick={handleVerifyPassword}
          className="px-6 py-2.5 bg-blue-500 text-white rounded-xl text-base font-medium"
        >
          确认
        </button>
      </div>
    );
  }

  function handleEdit(task: Task) {
    setEditingTask(task);
    setShowForm(true);
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除此任务？')) return;
    await deleteTask(id);
    await refreshData();
  }

  async function handleToggleActive(task: Task) {
    await updateTask(task.id, { isActive: task.isActive ? 0 : 1 });
    await refreshData();
  }

  async function handleAddTemplate(template: typeof TEMPLATES[0]) {
    try {
      const { createTask } = await import('../hooks/useTasks');
      await createTask(template);
      await refreshData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">任务管理</h1>
        <button
          onClick={() => {
            setEditingTask(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium"
        >
          + 新建任务
        </button>
      </div>

      {/* 快捷模板 */}
      <div className="mb-6">
        <h2 className="text-sm text-gray-500 mb-2">快捷创建</h2>
        <div className="flex gap-2 flex-wrap">
          {TEMPLATES.map(t => (
            <button
              key={t.name}
              onClick={() => handleAddTemplate(t)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl border border-gray-200 text-sm hover:border-blue-300"
            >
              <span>{t.emoji}</span>
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 任务列表 */}
      <div className="flex flex-col gap-2">
        {allTasks.length === 0 && (
          <p className="text-center text-gray-400 py-8">暂无任务，点击上方按钮创建</p>
        )}
        {allTasks.map(task => (
          <div
            key={task.id}
            className={`flex items-center justify-between bg-white rounded-xl p-3 border ${
              task.isActive ? 'border-gray-100' : 'border-gray-200 opacity-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{task.emoji}</span>
              <div>
                <span className="font-medium text-base">{task.name}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    subjectColors[task.subject] || subjectColors['其他']
                  }`}>
                    {task.subject}
                  </span>
                  <span className="text-xs text-gray-400">
                    {repeatLabels[task.repeatType]}
                  </span>
                  {task.estimatedMin > 0 && (
                    <span className="text-xs text-gray-400">
                      {task.estimatedMin}分钟
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleActive(task)}
                className={`text-xs px-2 py-1 rounded-lg ${
                  task.isActive
                    ? 'bg-gray-100 text-gray-500'
                    : 'bg-green-100 text-green-600'
                }`}
              >
                {task.isActive ? '停用' : '启用'}
              </button>
              <button
                onClick={() => handleEdit(task)}
                className="text-blue-500 text-sm"
              >
                编辑
              </button>
              <button
                onClick={() => handleDelete(task.id)}
                className="text-red-400 text-sm"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 表单弹窗 */}
      {showForm && (
        <TaskForm
          editingTask={editingTask}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            refreshData();
          }}
        />
      )}
    </div>
  );
}
