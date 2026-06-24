import { useEffect, useState } from 'react';
import { useApp } from '../App';
import { fetchBalance } from '../hooks/useRedemptions';
import type { Redemption, Product } from '../types';

const API_PRODUCTS = '/api/products';
const API_REDEMPTIONS = '/api/redemptions';

export default function RedemptionPage() {
  const { isParentMode, setParentMode, refreshData } = useApp();
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // 商品列表
  const [products, setProducts] = useState<Product[]>([]);
  // 兑换记录（我的申请）
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  // 待审批申请（家长视图）
  const [pendingList, setPendingList] = useState<Redemption[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // 商品管理（家长）
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPoints, setFormPoints] = useState(10);
  const [formPhoto, setFormPhoto] = useState<File | null>(null);
  const [formPassword, setFormPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // 申请确认
  const [applyingProduct, setApplyingProduct] = useState<Product | null>(null);

  // 家长模式入口（弹窗方式）
  const [showParentGate, setShowParentGate] = useState(false);

  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [isParentMode]);

  async function loadData() {
    try {
      setLoading(true);
      const [p, r, b] = await Promise.all([
        fetchProducts(),
        fetchRedemptions(),
        fetchBalance(),
      ]);
      setProducts(p);
      setRedemptions(r);
      setBalance(b);
      if (isParentMode) {
        const pending = r.filter(x => x.status === 'pending');
        setPendingList(pending);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProducts(): Promise<Product[]> {
    const res = await fetch(API_PRODUCTS);
    if (!res.ok) throw new Error('获取商品列表失败');
    return res.json();
  }

  async function fetchRedemptions(): Promise<Redemption[]> {
    const res = await fetch(API_REDEMPTIONS);
    if (!res.ok) throw new Error('获取兑换记录失败');
    return res.json();
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
        setPassword('');
        setPasswordError('');
        setShowParentGate(false);
      } else {
        setPasswordError('密码错误');
      }
    } catch {
      setPasswordError('验证失败');
    }
  }

  // ── 商品管理（家长）──────────────────────────────

  function openAddProduct() {
    setEditingProduct(null);
    setFormName('');
    setFormDesc('');
    setFormPoints(10);
    setFormPhoto(null);
    setFormPassword('');
    setShowProductForm(true);
  }

  function openEditProduct(p: Product) {
    setEditingProduct(p);
    setFormName(p.name);
    setFormDesc(p.description || '');
    setFormPoints(p.points);
    setFormPhoto(null);
    setFormPassword('');
    setShowProductForm(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || formPoints <= 0) return;
    try {
      setSaving(true);
      setError('');
      const formData = new FormData();
      formData.append('name', formName.trim());
      formData.append('description', formDesc.trim());
      formData.append('points', String(formPoints));
      formData.append('password', formPassword);
      if (formPhoto) formData.append('photo', formPhoto);

      const url = editingProduct
        ? `${API_PRODUCTS}/${editingProduct.id}`
        : API_PRODUCTS;
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, { method, body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '保存失败');
      }
      setShowProductForm(false);
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct(p: Product) {
    const pw = prompt('请输入家长密码确认删除：');
    if (!pw) return;
    try {
      setError('');
      const res = await fetch(`${API_PRODUCTS}/${p.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '删除失败');
      }
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  // ── 学生申请兑换 ────────────────────────────────

  async function handleApplyProduct() {
    if (!applyingProduct) return;
    try {
      setError('');
      const res = await fetch(`${API_REDEMPTIONS}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: applyingProduct.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '申请失败');
      }
      setApplyingProduct(null);
      await loadData();
      await refreshData();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  // ── 家长审批 ────────────────────────────────────

  async function handleApprove(r: Redemption) {
    const pw = prompt('请输入家长密码确认通过：');
    if (!pw) return;
    try {
      setError('');
      const res = await fetch(`${API_REDEMPTIONS}/${r.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '审批失败');
      }
      await loadData();
      await refreshData();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleReject(r: Redemption) {
    if (!confirm('确定拒绝此申请？')) return;
    const pw = prompt('请输入家长密码确认拒绝：');
    if (!pw) return;
    try {
      setError('');
      const res = await fetch(`${API_REDEMPTIONS}/${r.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '操作失败');
      }
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  // ── 主视图 ──────────────────────────────────────

  const statusLabel: Record<string, { text: string; color: string }> = {
    pending: { text: '待审批', color: 'text-yellow-600 bg-yellow-50' },
    approved: { text: '已通过', color: 'text-green-600 bg-green-50' },
    rejected: { text: '已拒绝', color: 'text-red-600 bg-red-50' },
  };

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">积分商城</h1>
        <div className="flex gap-2">
          {isParentMode ? (
            <>
              <button
                onClick={openAddProduct}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium"
              >
                + 添加商品
              </button>
              <button
                onClick={() => {
                  setParentMode(false);
                  localStorage.removeItem('parentMode');
                }}
                className="px-3 py-2 bg-gray-200 text-gray-600 rounded-xl text-sm font-medium"
              >
                退出管理
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowParentGate(true)}
              className="px-3 py-2 bg-gray-100 text-gray-500 rounded-xl text-sm font-medium"
            >
              家长管理
            </button>
          )}
        </div>
      </div>

      {/* 积分余额 */}
      {balance !== null && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl p-4 mb-6 text-white">
          <div className="text-sm opacity-90">当前积分余额</div>
          <div className="text-3xl font-bold mt-1">🏆 {balance} 分</div>
        </div>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* 商品列表 */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-gray-600 mb-3">🎁 商品列表</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-400">加载中...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="text-4xl">🛍️</span>
            <p className="mt-2">暂无商品</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map(p => (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm"
              >
                {/* 商品图片 */}
                <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                  {p.photoUrl ? (
                    <img
                      src={p.photoUrl}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl">🎁</span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm text-gray-800 truncate">{p.name}</h3>
                  {p.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{p.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-orange-500">🏆 {p.points}</span>
                    {isParentMode ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditProduct(p)}
                          className="text-xs px-2 py-1 bg-gray-100 rounded-md text-gray-600"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          className="text-xs px-2 py-1 bg-red-50 rounded-md text-red-500"
                        >
                          删除
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setApplyingProduct(p)}
                        className="text-xs px-3 py-1 bg-blue-500 text-white rounded-md font-medium"
                      >
                        兑换
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 待审批申请（家长视图） */}
      {isParentMode && pendingList.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-600 mb-3">⏳ 待审批申请</h2>
          <div className="flex flex-col gap-2">
            {pendingList.map(r => (
              <div
                key={r.id}
                className="bg-white rounded-xl p-3 border border-gray-100 flex items-center justify-between"
              >
                <div>
                  <span className="font-medium text-sm">{r.name}</span>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {r.date} · 消耗 {r.points} 积分
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(r)}
                    className="text-xs px-3 py-1.5 bg-green-500 text-white rounded-lg font-medium"
                  >
                    通过
                  </button>
                  <button
                    onClick={() => handleReject(r)}
                    className="text-xs px-3 py-1.5 bg-red-500 text-white rounded-lg font-medium"
                  >
                    拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 我的申请（学生视图） */}
      {!isParentMode && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-600 mb-3">📋 我的申请</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-400">加载中...</div>
          ) : redemptions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <span className="text-4xl">📝</span>
              <p className="mt-2">暂无申请记录</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {redemptions.map(r => {
                const st = statusLabel[r.status] || statusLabel.pending;
                return (
                  <div
                    key={r.id}
                    className="bg-white rounded-xl p-3 border border-gray-100 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium text-sm">{r.name}</span>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {r.date} · 消耗 {r.points} 积分
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.color}`}>
                      {st.text}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 全部兑换记录（家长视图） */}
      {isParentMode && redemptions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-600 mb-3">📋 全部兑换记录</h2>
          <div className="flex flex-col gap-2">
            {redemptions.map(r => {
              const st = statusLabel[r.status] || statusLabel.pending;
              return (
                <div
                  key={r.id}
                  className="bg-white rounded-xl p-3 border border-gray-100 flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium text-sm">{r.name}</span>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {r.date} · 消耗 {r.points} 积分
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.color}`}>
                    {st.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 申请确认弹窗 */}
      {applyingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">确认兑换</h2>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                {applyingProduct.photoUrl ? (
                  <img src={applyingProduct.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">🎁</span>
                )}
              </div>
              <div>
                <h3 className="font-medium">{applyingProduct.name}</h3>
                {applyingProduct.description && (
                  <p className="text-sm text-gray-400 mt-0.5">{applyingProduct.description}</p>
                )}
                <p className="text-sm text-orange-500 mt-1">🏆 消耗 {applyingProduct.points} 积分</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              确认后积分将暂时冻结，等待家长审批通过后扣除。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setApplyingProduct(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-base font-medium"
              >
                取消
              </button>
              <button
                onClick={handleApplyProduct}
                className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white text-base font-medium"
              >
                确认申请
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 家长密码弹窗 */}
      {showParentGate && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">家长验证</h2>
            <p className="text-sm text-gray-500 mb-4">输入密码后可以管理商品、审批兑换申请</p>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()}
              placeholder="请输入家长密码"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-base text-center focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            />
            {passwordError && <p className="text-red-500 text-sm mb-3">{passwordError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowParentGate(false);
                  setPassword('');
                  setPasswordError('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-base font-medium"
              >
                取消
              </button>
              <button
                onClick={handleVerifyPassword}
                className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white text-base font-medium"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 商品表单弹窗（家长） */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6"
          >
            <h2 className="text-lg font-bold mb-4">
              {editingProduct ? '编辑商品' : '添加商品'}
            </h2>

            <label className="block mb-3">
              <span className="text-sm text-gray-600">商品名称 *</span>
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
              <span className="text-sm text-gray-600">商品描述</span>
              <textarea
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                placeholder="可选，描述商品详情"
                rows={2}
                className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="block mb-3">
              <span className="text-sm text-gray-600">所需积分 *</span>
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
              <span className="text-sm text-gray-600">商品图片（选填）</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={e => setFormPhoto(e.target.files?.[0] || null)}
                className="w-full mt-1 text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
              />
              {editingProduct?.photoUrl && !formPhoto && (
                <div className="mt-2 w-16 h-16 bg-gray-50 rounded-lg overflow-hidden">
                  <img src={editingProduct.photoUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </label>

            <label className="block mb-3">
              <span className="text-sm text-gray-600">家长密码 *</span>
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
                onClick={() => { setShowProductForm(false); setError(''); }}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-base font-medium"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white text-base font-medium disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
