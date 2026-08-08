import { useState } from 'react';
import { ScheduleEntry, ScheduleAttendance } from '../types';
import { markAttendance, deleteAttendance } from '../hooks/useScheduleAttendance';

interface Props {
  entry: ScheduleEntry;
  date: string;
  currentStatus: 'attended' | 'makeup' | 'absent' | null;
  onClose: () => void;
  onSaved: () => void;
}

type Status = 'attended' | 'makeup' | 'absent';

const STATUS_OPTIONS: { value: Status; label: string; icon: string; activeColor: string }[] = [
  { value: 'attended', label: '上了', icon: '✅', activeColor: 'bg-green-500 text-white' },
  { value: 'makeup', label: '补上', icon: '🔄', activeColor: 'bg-blue-500 text-white' },
  { value: 'absent', label: '缺席', icon: '❌', activeColor: 'bg-red-500 text-white' },
];

export default function AttendancePicker({ entry, date, currentStatus, onClose, onSaved }: Props) {
  const [selected, setSelected] = useState<Status | null>(currentStatus);
  const [saving, setSaving] = useState(false);

  async function handleSelect(status: Status) {
    setSaving(true);
    try {
      if (selected === status) {
        // 再次点击同一状态 = 取消
        await deleteAttendance(entry.id, date);
        setSelected(null);
      } else {
        await markAttendance(entry.id, date, status);
        setSelected(status);
      }
      onSaved();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-1">
          {entry.emoji} {entry.name}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          {date} · {entry.startTime} - {entry.endTime}
        </p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              disabled={saving}
              onClick={() => handleSelect(opt.value)}
              className={`flex flex-col items-center justify-center py-4 rounded-xl text-base font-medium transition-all ${
                selected === opt.value
                  ? opt.activeColor
                  : 'bg-gray-100 text-gray-600'
              } ${saving ? 'opacity-50' : ''}`}
            >
              <span className="text-2xl mb-1">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-600 text-base font-medium"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
