import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../App';
import { ExerciseType, Exercise, ExerciseSet } from '../types';
import { fetchExerciseTypes, createExerciseType } from '../hooks/useExerciseTypes';
import { fetchTodayExercises, createExercise, deleteExercise } from '../hooks/useExercises';
import { fetchExerciseOverview } from '../hooks/useExerciseStats';
import ExerciseForm from '../components/ExerciseForm';
import ExerciseItem from '../components/ExerciseItem';
import ExerciseCalendar from '../components/ExerciseCalendar';
import ExerciseStatsChart from '../components/ExerciseStatsChart';
import ExerciseHistory from '../components/ExerciseHistory';

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

type Tab = 'checkin' | 'stats';

export default function ExercisePage() {
  const { isParentMode, refreshData } = useApp();
  const [tab, setTab] = useState<Tab>('checkin');
  const [exerciseTypes, setExerciseTypes] = useState<ExerciseType[]>([]);
  const [todayExercises, setTodayExercises] = useState<Exercise[]>([]);
  const [overview, setOverview] = useState({
    todayCount: 0,
    weekCount: 0,
    totalSuns: 0,
    currentStreak: 0,
    totalPoints: 0,
  });
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<ExerciseType | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showMakeupPicker, setShowMakeupPicker] = useState(false);
  const [makeupDate, setMakeupDate] = useState('');
  const [makeupExercises, setMakeupExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日 ${WEEKDAYS[now.getDay()]}`;
  const todayStr = now.toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [types, today, ov] = await Promise.all([
        fetchExerciseTypes(),
        fetchTodayExercises(),
        fetchExerciseOverview(),
      ]);
      setExerciseTypes(types);
      setTodayExercises(today);
      setOverview(ov);
    } catch (err) {
      console.error('加载运动数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 默认补卡日期为昨天
  useEffect(() => {
    if (showMakeupPicker && !makeupDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      setMakeupDate(yesterday.toISOString().split('T')[0]);
    }
  }, [showMakeupPicker, makeupDate]);

  function handleSelectType(type: ExerciseType) {
    setSelectedType(type);
    setShowTypePicker(false);
    setShowForm(true);
  }

  function handleDelete(id: number) {
    if (!confirm('确定删除此运动记录？')) return;
    deleteExercise(id).then(() => {
      loadData();
      refreshData();
    }).catch(err => alert((err as Error).message));
  }

  async function handleSaveExercise(data: { exerciseTypeId: number; quality: number; sets: ExerciseSet[]; note: string }) {
    await createExercise(data);
  }

  async function handleSaveMakeup(data: { exerciseTypeId: number; quality: number; sets: ExerciseSet[]; note: string }) {
    await createExercise({ ...data, date: makeupDate });
  }

  async function handleAddCustomType(data: { name: string; emoji: string; unit: string }) {
    if (!isParentMode) return;
    try {
      await createExerciseType(data);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  // 获取指定日期的运动记录（用于补卡页面显示已打卡的）
  async function loadMakeupDateExercises(date: string) {
    try {
      const { fetchExercises } = await import('../hooks/useExercises');
      const exercises = await fetchExercises({ startDate: date, endDate: date });
      setMakeupExercises(exercises);
    } catch (err) {
      console.error('加载运动记录失败:', err);
      setMakeupExercises([]);
    }
  }

  function handleMakeupDateChange(date: string) {
    setMakeupDate(date);
    loadMakeupDateExercises(date);
  }

  function handleOpenMakeupPicker() {
    setShowMakeupPicker(true);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];
    setMakeupDate(yStr);
    loadMakeupDateExercises(yStr);
  }

  return (
    <div className="p-4 pb-24">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">{dateStr}</h1>
        {overview.currentStreak > 0 && (
          <div className="flex items-center gap-1 bg-orange-100 text-orange-600 px-3 py-1.5 rounded-full text-sm font-medium">
            <span>🔥</span>
            <span>连续 {overview.currentStreak} 天</span>
          </div>
        )}
      </div>

      {/* Tab 切换 */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => setTab('checkin')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'checkin' ? 'bg-white shadow text-orange-600' : 'text-gray-500'
          }`}
        >
          🏃 打卡
        </button>
        <button
          onClick={() => setTab('stats')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'stats' ? 'bg-white shadow text-orange-600' : 'text-gray-500'
          }`}
        >
          📊 统计
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">加载中...</div>
      ) : tab === 'checkin' ? (
        <>
          {/* 今日概览 */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
              <div className="text-xs text-gray-500">今日运动</div>
              <div className="text-xl font-bold text-orange-600 mt-1">{overview.todayCount}</div>
              <div className="text-xs text-gray-400">次</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
              <div className="text-xs text-gray-500">今日太阳</div>
              <div className="text-xl font-bold text-yellow-500 mt-1">☀️ {overview.totalSuns}</div>
              <div className="text-xs text-gray-400">个</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
              <div className="text-xs text-gray-500">本周运动</div>
              <div className="text-xl font-bold text-blue-600 mt-1">{overview.weekCount}</div>
              <div className="text-xs text-gray-400">次</div>
            </div>
          </div>

          {/* 今日运动记录 */}
          {todayExercises.length > 0 && (
            <div className="mb-4">
              <h2 className="text-sm font-medium text-gray-500 mb-2">今日运动</h2>
              <div className="flex flex-col gap-2">
                {todayExercises.map(ex => (
                  <ExerciseItem key={ex.id} exercise={ex} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {/* 开始运动按钮 */}
          <button
            onClick={() => setShowTypePicker(true)}
            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium text-base shadow-sm active:scale-[0.98] transition-transform"
          >
            🏃 开始运动
          </button>

          {/* 补卡入口 */}
          <button
            onClick={handleOpenMakeupPicker}
            className="flex items-center justify-center gap-2 mt-3 py-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-600 font-medium text-sm hover:bg-orange-100 transition-colors w-full"
          >
            <span>🔙</span>
            <span>补运动打卡 — 补上之前漏掉的运动</span>
          </button>

          {todayExercises.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <span className="text-4xl block mb-2">🏃‍♂️</span>
              <p>今天还没有运动记录</p>
              <p className="text-sm mt-1">点击上方按钮开始运动吧！</p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* 统计 Tab */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-500 mb-1">本周运动</div>
              <p className="text-2xl font-bold text-orange-600">{overview.weekCount}</p>
              <div className="text-xs text-gray-400">次</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-500 mb-1">累计太阳</div>
              <p className="text-2xl font-bold text-yellow-500">☀️ {overview.totalSuns}</p>
              <div className="text-xs text-gray-400">个（{overview.totalPoints} 积分）</div>
            </div>
          </div>

          <ExerciseCalendar />
          <div className="mt-6">
            <ExerciseStatsChart />
          </div>
          <div className="mt-6">
            <ExerciseHistory />
          </div>
        </>
      )}

      {/* 运动类型选择弹窗（正常打卡） */}
      {showTypePicker && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">选择运动类型</h2>
              <button onClick={() => setShowTypePicker(false)} className="text-gray-400 text-2xl leading-none">&times;</button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {exerciseTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => handleSelectType(type)}
                  className="flex flex-col items-center gap-1.5 p-4 bg-gray-50 rounded-xl hover:bg-orange-50 hover:border-orange-200 border border-transparent transition-colors"
                >
                  <span className="text-3xl">{type.emoji}</span>
                  <span className="text-sm font-medium text-gray-700">{type.name}</span>
                  <span className="text-xs text-gray-400">单位: {type.unit}</span>
                </button>
              ))}
            </div>
            {isParentMode && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <CustomTypeForm onAdd={handleAddCustomType} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 补卡：日期选择 + 运动类型选择弹窗 */}
      {showMakeupPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">🔙 补运动打卡</h2>
              <button onClick={() => { setShowMakeupPicker(false); setSelectedType(null); }} className="text-gray-400 text-2xl leading-none">&times;</button>
            </div>

            {/* 日期选择 */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
              <label className="text-sm text-gray-500 mb-2 block">选择日期</label>
              <input
                type="date"
                value={makeupDate}
                max={todayStr}
                onChange={e => handleMakeupDateChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* 该日期已完成的运动 */}
            {makeupExercises.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">该日已打卡</h3>
                <div className="flex flex-col gap-2">
                  {makeupExercises.map(ex => (
                    <ExerciseItem key={ex.id} exercise={ex} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            )}

            {/* 选择运动类型进行补卡 */}
            {!selectedType ? (
              <>
                <h3 className="text-sm font-medium text-gray-500 mb-2">选择要补卡的运动类型</h3>
                <div className="grid grid-cols-3 gap-3">
                  {exerciseTypes.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type)}
                      className="flex flex-col items-center gap-1.5 p-4 bg-gray-50 rounded-xl hover:bg-orange-50 hover:border-orange-200 border border-transparent transition-colors"
                    >
                      <span className="text-3xl">{type.emoji}</span>
                      <span className="text-sm font-medium text-gray-700">{type.name}</span>
                      <span className="text-xs text-gray-400">单位: {type.unit}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-2">
                <button
                  onClick={() => setSelectedType(null)}
                  className="text-sm text-gray-400 mb-2"
                >
                  ← 重新选择运动类型
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 运动打卡表单（正常打卡） */}
      {showForm && selectedType && !showMakeupPicker && (
        <ExerciseForm
          exerciseType={selectedType}
          onClose={() => {
            setShowForm(false);
            setSelectedType(null);
          }}
          onSaved={async (data) => {
            await handleSaveExercise(data);
            setShowForm(false);
            setSelectedType(null);
            await loadData();
            await refreshData();
          }}
        />
      )}

      {/* 运动打卡表单（补卡） */}
      {showMakeupPicker && selectedType && (
        <ExerciseForm
          exerciseType={selectedType}
          onClose={() => {
            setSelectedType(null);
          }}
          onSaved={async (data) => {
            await handleSaveMakeup(data);
            setSelectedType(null);
            await loadMakeupDateExercises(makeupDate);
            await loadData();
            await refreshData();
          }}
          isMakeup
          makeupDate={makeupDate}
        />
      )}
    </div>
  );
}

function CustomTypeForm({ onAdd }: { onAdd: (data: { name: string; emoji: string; unit: string }) => void }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏃');
  const [unit, setUnit] = useState('次');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), emoji, unit: unit.trim() || '次' });
    setName('');
    setEmoji('🏃');
    setUnit('次');
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="text-sm font-medium text-gray-600 mb-2">+ 新增自定义运动</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={emoji}
          onChange={e => setEmoji(e.target.value)}
          className="w-12 px-2 py-2 border border-gray-200 rounded-lg text-center text-lg"
          maxLength={2}
        />
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="运动名称"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          required
        />
        <input
          type="text"
          value={unit}
          onChange={e => setUnit(e.target.value)}
          placeholder="单位"
          className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm"
        />
        <button type="submit" className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium">
          添加
        </button>
      </div>
    </form>
  );
}
