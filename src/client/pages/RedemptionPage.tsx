import { useEffect, useState } from 'react';
import { useApp } from '../App';
import { fetchRedemptions, fetchBalance, createRedemption, deleteRedemption } from '../hooks/useRedemptions';
import type { Redemption } from '../types';

export default function RedemptionPage() {
  const { isParentMode, setParentMode, refreshData } = useApp();
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPoints, setFormPoints] = useState(10);
  const [formPassword, setFormPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isParentMode) {
      loadData();
    }
  }, [isParentMode]);

  async function loadData() {
    try {
      setLoading(true);
      const [r, b] = await Promise.all([fetchRedemptions(), fetchBalance()]);
      setRedemptions(r);
      setBalance(b);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || formPoints <= 0) return;
    try {
      setSaving(true);
      setError('');
      await createRedemption({ name: formName.trim(), points: formPoints, password: formPassword });
      setFormName('');
      setFormPoints(10);
      setFormPassword('');
      setShowForm(false);
      await loadData();
      await refreshData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除此兑换记录？积分将返还。')) return;
    try {
      setError('');
      await deleteRedemption(id, password);
      await loadData();
      await refreshData();
    } catch (err) {
      setError((err as Error).message);
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
        {passwordError && <p className="text-red-500 text-sm mb-3">{passwordError}</p>}
        <button
          onClick={handleVerifyPassword}
          className="px-6 py-2.5 bg-blue-500 text-white rounded-xl text-base font-medium"
        >
          确认
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">积分兑换</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium"
        >
          + 新增兑换
        </button>
      </div>

      {/* 积分余额 */}
      {balance !== null && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl p-4 mb-6 text-white">
          <div className="text-sm opacity-90">当前积分余额</div>
          <div className="text-3xl font-bold mt-1">🏆 {balance} 分</div>
        </div>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* 兑换记录 */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">加载中...</div>
      ) : redemptions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <span className="text-4xl">🎁</span>
          <p className="mt-2">暂无兑换记录</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {redemptions.map(r => (
            <div key={r.id} className="bg-white rounded-xl p-3 border border-gray-100 flex items-center justify-between">
              <div>
                <span className="font-medium">{r.name}</span>
                <div className="text-xs text-gray-400 mt-0.5">
                  {r.date} · 消耗 {r.points} 积分
                </div>
              </div>
              <button
                onClick={() => handleDelete(r.id)}
                className="text-red-400 text-sm px-2"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 新增表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <form
            onSubmit={handleCreate}
            className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6"
          >
            <h2 className="text-lg font-bold mb-4">新增兑换记录</h2>

            <label className="block mb-3">
              <span className="text-sm text-gray-600">兑换内容</span>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="如：看30分钟电视"
                className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </label>

            <label className="block mb-3">
              <span className="text-sm text-gray-600">消耗积分</span>
              <input
                type="number"
                value={formPoints}
                onChange={e => setFormPoints(Number(e.target.value))}
                min={1}
                className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </label>

            <label className="block mb-3">
              <span className="text-sm text-gray-600">家长密码</span>
              <input
                type="password"
                value={formPassword}
                onChange={e => setFormPassword(e.target.value)}
                placeholder="请输入家长密码"
                className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </label>

            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(''); }}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-base font-medium"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white text-base font-medium disabled:opacity-50"
              >
                {saving ? '保存中...' : '确认兑换'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
