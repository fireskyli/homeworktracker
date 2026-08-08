import { useState, useEffect, useCallback } from 'react';
import { ScheduleEntry, ScheduleAttendance, ScheduleEntryWithStatus } from '../types';
import { useApp } from '../App';
import { fetchSchedules } from '../hooks/useSchedules';
import { fetchAttendances } from '../hooks/useScheduleAttendance';
import ScheduleForm from '../components/ScheduleForm';
import AttendancePicker from '../components/AttendancePicker';
import AttendanceStats from '../components/AttendanceStats';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** 判断某课程在某天（YYYY-MM-DD）是否发生 */
function entryOccursOn(entry: ScheduleEntry, dateStr: string): boolean {
  if (entry.repeatType === 'weekly') {
    const d = new Date(dateStr + 'T00:00:00');
    return entry.repeatDays.includes(d.getDay());
  }
  return entry.date === dateStr;
}

/** 获取课程在某天的出勤状态 */
function getAttendanceStatus(
  entry: ScheduleEntry,
  dateStr: string,
  attendanceMap: Map<number, Map<string, string>>
): 'attended' | 'makeup' | 'absent' | 'pending' | null {
  // 先查是否发生
  if (!entryOccursOn(entry, dateStr)) return null;

  // 未来日期 = pending
  const today = new Date().toISOString().split('T')[0];
  if (dateStr > today) return 'pending';

  // 查显式记录
  const record = attendanceMap.get(entry.id)?.get(dateStr);
  if (record) return record as 'attended' | 'makeup' | 'absent';

  // 过去日期无记录 = 自动缺席
  return 'absent';
}

/** 根据状态获取样式 */
function getStatusStyle(status: 'attended' | 'makeup' | 'absent' | 'pending' | null, type: string): string {
  if (status === 'attended') return 'bg-green-100 text-green-700';
  if (status === 'makeup') return 'bg-blue-100 text-blue-700';
  if (status === 'absent') return 'bg-red-100 text-red-700';
  if (status === 'pending') return type === 'tutoring' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
  return type === 'tutoring' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
}

function getStatusIcon(status: 'attended' | 'makeup' | 'absent' | 'pending' | null): string {
  if (status === 'attended') return '✅';
  if (status === 'makeup') return '🔄';
  if (status === 'absent') return '❌';
  return '';
}

export default function SchedulePage() {
  const { refreshData } = useApp();
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [attendances, setAttendances] = useState<ScheduleAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ScheduleEntry | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>();
  // 出勤选择器
  const [pickerEntry, setPickerEntry] = useState<ScheduleEntry | null>(null);
  const [pickerDate, setPickerDate] = useState<string>('');
  const [pickerStatus, setPickerStatus] = useState<'attended' | 'makeup' | 'absent' | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const list = await fetchSchedules();
      setEntries(list);

      // 加载当月的出勤记录
      const startDate = `${year}-${pad(month + 1)}-01`;
      const endDate = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;
      const att = await fetchAttendances(startDate, endDate);
      setAttendances(att);
    } catch (err) {
      console.error('加载课程失败:', err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 构建出勤查询 map
  const attendanceMap = new Map<number, Map<string, string>>();
  for (const a of attendances) {
    if (!attendanceMap.has(a.scheduleId)) {
      attendanceMap.set(a.scheduleId, new Map());
    }
    attendanceMap.get(a.scheduleId)!.set(a.date, a.status);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function dateStr(day: number) {
    return `${year}-${pad(month + 1)}-${pad(day)}`;
  }

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m);
    setYear(y);
  }

  function dayEntries(day: number) {
    const ds = dateStr(day);
    return entries.filter(e => entryOccursOn(e, ds));
  }

  function openCreate(day?: number) {
    setEditing(null);
    setDefaultDate(day ? dateStr(day) : undefined);
    setShowForm(true);
  }

  function openEdit(entry: ScheduleEntry) {
    setEditing(entry);
    setDefaultDate(undefined);
    setShowForm(true);
  }

  function openPicker(entry: ScheduleEntry, date: string) {
    const status = getAttendanceStatus(entry, date, attendanceMap);
    if (status === 'pending') return; // 未来日期不可标记
    setPickerEntry(entry);
    setPickerDate(date);
    setPickerStatus(status === 'absent' && !attendanceMap.get(entry.id)?.has(date) ? null : status);
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">📅 课程表</h1>
        <button
          onClick={() => openCreate()}
          className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium"
        >
          ＋ 新增
        </button>
      </div>

      {/* 月份切换 */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => changeMonth(-1)}
          className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 text-lg"
        >
          ‹
        </button>
        <div className="text-base font-semibold">
          {year}年 {MONTHS[month]}
        </div>
        <button
          onClick={() => changeMonth(1)}
          className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 text-lg"
        >
          ›
        </button>
      </div>

      {/* 星期表头 */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div
            key={i}
            className={`text-center text-xs font-medium py-1 ${i === 0 || i === 6 ? 'text-red-400' : 'text-gray-400'}`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* 月历网格 */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[70px] bg-gray-50 rounded-lg" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const occ = dayEntries(day);
          const isToday = dateStr(day) === new Date().toISOString().split('T')[0];
          return (
            <div
              key={day}
              onClick={() => openCreate(day)}
              className={`min-h-[70px] rounded-lg p-1 cursor-pointer border transition-colors ${
                isToday ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-100 hover:bg-gray-50'
              }`}
            >
              <div className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                {day}
              </div>
              <div className="space-y-1 mt-1">
                {occ.slice(0, 3).map(e => {
                  const status = getAttendanceStatus(e, dateStr(day), attendanceMap);
                  const style = getStatusStyle(status, e.type);
                  const icon = getStatusIcon(status);
                  return (
                    <div
                      key={e.id}
                      onClick={ev => {
                        ev.stopPropagation();
                        if (status !== 'pending') {
                          openPicker(e, dateStr(day));
                        } else {
                          openEdit(e);
                        }
                      }}
                      className={`px-1 py-0.5 rounded text-[10px] leading-tight truncate cursor-pointer ${style}`}
                    >
                      {icon && <span className="mr-0.5">{icon}</span>}
                      {e.emoji} {e.startTime} {e.name}
                    </div>
                  );
                })}
                {occ.length > 3 && (
                  <div className="text-[10px] text-gray-400 px-1">+{occ.length - 3} 更多</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-3 mt-4 text-xs text-gray-500 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-100 inline-block" /> 上了
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-100 inline-block" /> 补上
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-100 inline-block" /> 缺席
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-orange-100 inline-block" /> 补习班
        </span>
        <span className="text-gray-300">|</span>
        <span>点击课程标记出勤，点击日期新建</span>
      </div>

      {/* 出勤统计 */}
      <AttendanceStats
        year={year}
        month={month}
        onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
      />

      {/* 表单弹窗 */}
      {showForm && (
        <ScheduleForm
          editing={editing}
          defaultDate={defaultDate}
          onClose={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await loadData();
            await refreshData();
          }}
          onDeleted={async () => {
            setShowForm(false);
            await loadData();
            await refreshData();
          }}
        />
      )}

      {/* 出勤选择器弹窗 */}
      {pickerEntry && (
        <AttendancePicker
          entry={pickerEntry}
          date={pickerDate}
          currentStatus={pickerStatus}
          onClose={() => setPickerEntry(null)}
          onSaved={async () => {
            await loadData();
          }}
        />
      )}

      {loading && (
        <div className="text-center text-gray-400 text-sm py-8">加载中...</div>
      )}
    </div>
  );
}
