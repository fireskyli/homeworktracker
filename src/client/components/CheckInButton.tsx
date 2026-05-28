import { useState, useRef } from 'react';
import { useApp } from '../App';
import { checkIn } from '../hooks/useCheckins';
import QualityStars from './QualityStars';

interface Props {
  taskId: number;
  isCheckedIn: boolean;
  quality: number | null;
  photoUrl?: string | null;
  checkInDate?: string;
}

export default function CheckInButton({ taskId, isCheckedIn, quality, photoUrl }: Props) {
  const { refreshData } = useApp();
  const [showStars, setShowStars] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<number | null>(quality);
  const [animating, setAnimating] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<string | null>(photoUrl || null);
  const [uploading, setUploading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isMakeup, setIsMakeup] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError('图片不能超过 5MB');
      return;
    }
    const formData = new FormData();
    formData.append('photo', file);
    try {
      setUploading(true);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('上传失败');
      const data = await res.json();
      setPhoto(data.url);
      setError('');
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleCheckIn() {
    if (isCheckedIn) return;

    if (!showStars) {
      setShowStars(true);
      return;
    }

    try {
      setAnimating(true);
      const today = new Date().toISOString().split('T')[0];
      const makeup = selectedDate !== today;
      const result = await checkIn(taskId, selectedQuality || undefined, photo || undefined, selectedDate, makeup);
      await refreshData();
      setShowStars(false);
      setShowDatePicker(false);
      setPhoto(null);
      setIsMakeup(false);
      // 显示获得积分
      if (result?.earnedPoints) {
        setPointsEarned(result.earnedPoints);
        setTimeout(() => setPointsEarned(null), 2000);
      }
      setTimeout(() => setAnimating(false), 600);
    } catch (err: unknown) {
      setError((err as Error).message);
      setAnimating(false);
    }
  }

  function handleDateChange(date: string) {
    setSelectedDate(date);
    const today = new Date().toISOString().split('T')[0];
    setIsMakeup(date !== today);
  }

  if (isCheckedIn) {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="text-green-500 font-medium text-base">✅ 已完成</span>
        {quality && <QualityStars value={quality} readonly />}
        {photoUrl && (
          <img
            src={photoUrl}
            alt="完成凭证"
            className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer"
            onClick={() => window.open(photoUrl, '_blank')}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {/* 照片上传区域 */}
      {showStars && (
        <div className="flex flex-col gap-2 bg-gray-50 px-3 py-2 rounded-lg w-full">
          {/* 照片预览/上传 */}
          <div className="flex items-center gap-2">
            {photo ? (
              <div className="relative">
                <img
                  src={photo}
                  alt="凭证预览"
                  className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => setPhoto(null)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors"
              >
                <span className="text-xl">{uploading ? '⏳' : '📷'}</span>
                <span className="text-[10px]">{uploading ? '上传中' : '拍照'}</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
          </div>

          {/* 日期选择 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">日期：</span>
            <input
              type="date"
              value={selectedDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => handleDateChange(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1"
            />
            {isMakeup && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                补打卡
              </span>
            )}
          </div>

          {/* 质量星级 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">完成质量：</span>
            <QualityStars value={selectedQuality} onChange={setSelectedQuality} />
          </div>
        </div>
      )}

      <button
        onClick={handleCheckIn}
        className={`px-5 py-2.5 rounded-xl font-medium text-base transition-all ${
          animating
            ? 'bg-green-500 text-white scale-110'
            : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
        }`}
      >
        {showStars ? '确认完成 ✓' : '完成 ✓'}
      </button>
      {showStars && (
        <button
          onClick={() => {
            setShowStars(false);
            setPhoto(null);
            setShowDatePicker(false);
            setSelectedDate(new Date().toISOString().split('T')[0]);
            setIsMakeup(false);
          }}
          className="text-sm text-gray-400"
        >
          取消
        </button>
      )}
      {error && <span className="text-red-500 text-sm">{error}</span>}
    </div>
  );
}
