import { useState } from 'react';
import { useApp } from '../App';

export default function SettingsPage() {
  const { isParentMode, setParentMode } = useApp();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [msg, setMsg] = useState('');

  async function handleChangePassword() {
    try {
      const res = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
      });
      if (res.ok) {
        setMsg('密码修改成功！');
        setOldPw('');
        setNewPw('');
      } else {
        const err = await res.json();
        setMsg(err.error || '修改失败');
      }
    } catch {
      setMsg('网络错误');
    }
    setTimeout(() => setMsg(''), 3000);
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-6">设置</h1>

      {/* 家长模式 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-base">家长模式</h3>
            <p className="text-sm text-gray-400 mt-0.5">
              {isParentMode ? '已开启' : '开启后可管理任务'}
            </p>
          </div>
          <button
            onClick={() => {
              if (isParentMode) {
                setParentMode(false);
                localStorage.removeItem('parentMode');
              }
            }}
            className={`w-12 h-7 rounded-full transition-colors ${
              isParentMode ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${
                isParentMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        {isParentMode && (
          <button
            onClick={() => {
              setParentMode(false);
              localStorage.removeItem('parentMode');
            }}
            className="mt-3 text-sm text-red-400"
          >
            退出家长模式
          </button>
        )}
      </div>

      {/* 修改密码 */}
      {isParentMode && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
          <h3 className="font-medium text-base mb-3">修改家长密码</h3>
          <input
            type="password"
            value={oldPw}
            onChange={e => setOldPw(e.target.value)}
            placeholder="原密码"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-base mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            placeholder="新密码（至少4位）"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-base mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleChangePassword}
            className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-base font-medium"
          >
            确认修改
          </button>
          {msg && (
            <p className={`text-sm mt-2 ${msg.includes('成功') ? 'text-green-500' : 'text-red-500'}`}>
              {msg}
            </p>
          )}
        </div>
      )}

      {/* 关于 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
        <span className="text-3xl">📚</span>
        <p className="text-sm text-gray-500 mt-2">小学生作业打卡系统 v1.0</p>
        <p className="text-xs text-gray-400 mt-1">让孩子养成好习惯 ✨</p>
      </div>
    </div>
  );
}
