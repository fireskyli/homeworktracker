import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task, TaskWithStatus } from '../types';
import { fetchTasksByDate } from '../hooks/useTasks';
import { checkIn } from '../hooks/useCheckins';
import QualityStars from '../components/QualityStars';

const subjectColors: Record<string, string> = {
  语文: 'bg-red-100 text-red-600',
  数学: 'bg-blue-100 text-blue-600',
  英语: 'bg-green-100 text-green-600',
  科学: 'bg-purple-100 text-purple-600',
  其他: 'bg-gray-100 text-gray-600',
};

export default function MakeupPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState('');
  const [tasks, setTasks] = useState<TaskWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  // 记录正在打卡的任务
  const [checkingIn, setCheckingIn] = useState<Set<number>>(new Set());
  // 每个任务的质量选择
  const [qualities, setQualities] = useState<Record<number, number | null>>({});
  // 每个任务的照片
  const [photos, setPhotos] = useState<Record<number, string | null>>({});
  const [uploading, setUploading] = useState<Set<number>>(new Set());
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // 默认选择昨天
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    setDate(yesterdayStr);
  }, []);

  useEffect(() => {
    if (date) loadTasks();
  }, [date]);

  async function loadTasks() {
    setLoading(true);
    try {
      const data = await fetchTasksByDate(date);
      setTasks(data as TaskWithStatus[]);
    } catch {
      setMsg('加载任务失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(taskId: number, file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setMsg('图片不能超过 5MB');
      return;
    }
    const formData = new FormData();
    formData.append('photo', file);
    setUploading(prev => new Set(prev).add(taskId));
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('上传失败');
      const data = await res.json();
      setPhotos(prev => ({ ...prev, [taskId]: data.url }));
    } catch (err: unknown) {
      setMsg((err as Error).message);
    } finally {
      setUploading(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }

  async function handleCheckIn(taskId: number) {
    setCheckingIn(prev => new Set(prev).add(taskId));
    setMsg('');
    try {
      const result = await checkIn(
        taskId,
        qualities[taskId] || undefined,
        photos[taskId] || undefined,
        date,
        true
      );
      setMsg(`✅ 补打卡成功！获得 ${result.earnedPoints || 0} 积分`);
      await loadTasks();
    } catch (err: unknown) {
      setMsg(`❌ ${(err as Error).message}`);
    } finally {
      setCheckingIn(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
    setTimeout(() => setMsg(''), 3000);
  }

  const uncheckedTasks = tasks.filter(t => !t.isCheckedIn);
  const checkedTasks = tasks.filter(t => t.isCheckedIn);

  return (
    <div className="p-4">
      {/* 头部 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-2xl text-gray-400 hover:text-gray-600"
        >
          ←
        </button>
        <h1 className="text-xl font-bold text-gray-800">🔙 补打卡</h1>
      </div>

      {/* 日期选择 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
        <label className="text-sm text-gray-500 mb-2 block">选择日期</label>
        <input
          type="date"
          value={date}
          max={today}
          onChange={e => setDate(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {msg && (
        <div className={`text-sm mb-4 p-3 rounded-lg ${msg.includes('✅') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
          {msg}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">加载中...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <span className="text-4xl block mb-2">📭</span>
          该日期没有需要完成的任务
        </div>
      ) : (
        <>
          {/* 未完成任务 */}
          {uncheckedTasks.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-gray-500 mb-3">
                未完成 ({uncheckedTasks.length})
              </h2>
              <div className="space-y-3">
                {uncheckedTasks.map(task => (
                  <div
                    key={task.id}
                    className="bg-white rounded-xl p-4 shadow-sm border border-orange-100"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{task.emoji}</span>
                        <div>
                          <h3 className="font-medium text-base text-gray-800">{task.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${subjectColors[task.subject] || subjectColors['其他']}`}>
                              {task.subject}
                            </span>
                            {task.overdueDays > 0 && (
                              <span className="text-xs text-orange-500">
                                已过期 {task.overdueDays} 天
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 质量选择 */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-gray-500">完成质量：</span>
                      <QualityStars
                        value={qualities[task.id] ?? null}
                        onChange={v => setQualities(prev => ({ ...prev, [task.id]: v }))}
                      />
                    </div>

                    {/* 照片上传 */}
                    <div className="flex items-center gap-2 mb-3">
                      {photos[task.id] ? (
                        <div className="relative">
                          <img
                            src={photos[task.id]!}
                            alt="凭证"
                            className="w-14 h-14 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            onClick={() => setPhotos(prev => ({ ...prev, [task.id]: null }))}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => fileInputRefs.current[task.id]?.click()}
                          disabled={uploading.has(task.id)}
                          className="w-14 h-14 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors"
                        >
                          <span className="text-lg">{uploading.has(task.id) ? '⏳' : '📷'}</span>
                          <span className="text-[10px]">照片</span>
                        </button>
                      )}
                      <input
                        ref={el => { fileInputRefs.current[task.id] = el; }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(task.id, file);
                        }}
                      />
                    </div>

                    {/* 打卡按钮 */}
                    <button
                      onClick={() => handleCheckIn(task.id)}
                      disabled={checkingIn.has(task.id)}
                      className="w-full py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                    >
                      {checkingIn.has(task.id) ? '打卡中...' : '🔙 补打卡'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 已完成任务 */}
          {checkedTasks.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-3">
                已完成 ({checkedTasks.length})
              </h2>
              <div className="space-y-2">
                {checkedTasks.map(task => (
                  <div
                    key={task.id}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{task.emoji}</span>
                      <div>
                        <h3 className="font-medium text-base text-gray-800">{task.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${subjectColors[task.subject] || subjectColors['其他']}`}>
                          {task.subject}
                        </span>
                      </div>
                    </div>
                    <span className="text-green-500 font-medium">✅ 已完成</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
