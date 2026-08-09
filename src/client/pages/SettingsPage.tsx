import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { fetchBackups, createBackup, restoreBackup, importBackup } from '../hooks/useBackups';
import { fetchPushConfig, savePushConfig, testPush, PushConfig, manualPushToday, manualPushWeekly } from '../hooks/useSchedules';
import { formatVersion } from '../version';

export default function SettingsPage() {
  const { isParentMode, setParentMode } = useApp();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [msg, setMsg] = useState('');
  const [backups, setBackups] = useState<{ name: string; size: number; time: string }[]>([]);
  const [backupMsg, setBackupMsg] = useState('');
  const [showBackups, setShowBackups] = useState(false);
  const [restoring, setRestoring] = useState('');
  const [importing, setImporting] = useState(false);
  const [pushConfig, setPushConfig] = useState<PushConfig>({ webhook: '', enabled: false });
  const [pushMsg, setPushMsg] = useState('');
  const [pushLoading, setPushLoading] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [manualPushing, setManualPushing] = useState(false);
  const [weeklyPushing, setWeeklyPushing] = useState(false);
  const [parentPw, setParentPw] = useState('');
  const [parentPwError, setParentPwError] = useState('');
  const [showParentGate, setShowParentGate] = useState(false);

  async function handleEnableParentMode() {
    try {
      const res = await fetch('/api/settings/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: parentPw }),
      });
      if (res.ok) {
        setParentMode(true);
        localStorage.setItem('parentMode', 'true');
        setParentPw('');
        setParentPwError('');
        setShowParentGate(false);
      } else {
        setParentPwError('密码错误');
      }
    } catch {
      setParentPwError('验证失败');
    }
  }

  // 加载推送配置
  useEffect(() => {
    fetchPushConfig().then(cfg => setPushConfig(cfg)).catch(() => {});
  }, []);

  async function handleSavePush() {
    setPushLoading(true);
    setPushMsg('');
    try {
      await savePushConfig(pushConfig);
      setPushMsg('✅ 推送配置已保存');
    } catch (err) {
      setPushMsg(`❌ ${(err as Error).message}`);
    } finally {
      setPushLoading(false);
    }
    setTimeout(() => setPushMsg(''), 3000);
  }

  async function handleTestPush() {
    setTestingPush(true);
    setPushMsg('');
    try {
      await testPush(pushConfig.webhook);
      setPushMsg('✅ 测试推送成功，请查看钉钉群');
    } catch (err) {
      setPushMsg(`❌ ${(err as Error).message}`);
    } finally {
      setTestingPush(false);
    }
    setTimeout(() => setPushMsg(''), 4000);
  }

  async function handleManualPush() {
    setManualPushing(true);
    setPushMsg('');
    try {
      const msg = await manualPushToday();
      setPushMsg(`✅ ${msg}`);
    } catch (err) {
      setPushMsg(`❌ ${(err as Error).message}`);
    } finally {
      setManualPushing(false);
    }
    setTimeout(() => setPushMsg(''), 4000);
  }

  async function handleWeeklyPush() {
    setWeeklyPushing(true);
    setPushMsg('');
    try {
      const msg = await manualPushWeekly();
      setPushMsg(`✅ ${msg}`);
    } catch (err) {
      setPushMsg(`❌ ${(err as Error).message}`);
    } finally {
      setWeeklyPushing(false);
    }
    setTimeout(() => setPushMsg(''), 4000);
  }

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

  async function loadBackups() {
    const next = !showBackups;
    setShowBackups(next);
    if (next) {
      try {
        const data = await fetchBackups();
        setBackups(data);
        setBackupMsg('');
      } catch {
        setBackupMsg('获取备份列表失败');
      }
    }
  }

  async function handleCreateBackup() {
    try {
      await createBackup();
      setBackupMsg('✅ 备份成功！');
      const data = await fetchBackups();
      setBackups(data);
    } catch {
      setBackupMsg('❌ 备份失败');
    }
    setTimeout(() => setBackupMsg(''), 3000);
  }

  async function handleRestore(name: string) {
    if (!confirm(`确定要从 ${name} 恢复吗？\n\n恢复前会自动备份当前数据。`)) return;
    setRestoring(name);
    setBackupMsg('');
    try {
      await restoreBackup(name);
      setBackupMsg('✅ 恢复成功！请刷新页面。');
    } catch {
      setBackupMsg('❌ 恢复失败');
    }
    setRestoring('');
    setTimeout(() => setBackupMsg(''), 5000);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.db')) {
      setBackupMsg('❌ 请选择 .db 文件');
      return;
    }
    if (!confirm(`确定要导入 ${file.name} 吗？\n\n导入前会自动备份当前数据，导入后立即生效。`)) return;
    setImporting(true);
    setBackupMsg('');
    try {
      await importBackup(file);
      setBackupMsg('✅ 导入并恢复成功！请刷新页面。');
    } catch {
      setBackupMsg('❌ 导入失败');
    }
    setImporting(false);
    e.target.value = '';
    setTimeout(() => setBackupMsg(''), 5000);
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
              } else {
                setShowParentGate(true);
              }
            }}
            className={`w-12 h-7 rounded-full transition-colors ${isParentMode ? 'bg-blue-500' : 'bg-gray-300'}`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${isParentMode ? 'translate-x-5' : 'translate-x-0'}`}
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

      {/* 家长模式验证弹窗 */}
      {showParentGate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-xs rounded-2xl p-6 mx-4">
            <h3 className="text-lg font-bold mb-4 text-center">🔒 家长验证</h3>
            <input
              type="password"
              value={parentPw}
              onChange={e => setParentPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEnableParentMode()}
              placeholder="请输入家长密码"
              autoFocus
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-base text-center focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            />
            {parentPwError && (
              <p className="text-red-500 text-sm text-center mb-3">{parentPwError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowParentGate(false); setParentPw(''); setParentPwError(''); }}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-base font-medium"
              >
                取消
              </button>
              <button
                onClick={handleEnableParentMode}
                className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white text-base font-medium"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* 数据备份 */}
      {isParentMode && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
          <h3 className="font-medium text-base mb-3">💾 数据备份</h3>

          <div className="flex gap-2 mb-3">
            <button
              onClick={handleCreateBackup}
              className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium"
            >
              📋 立即备份
            </button>
            <label className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium text-center cursor-pointer">
              {importing ? '导入中...' : '📥 导入备份'}
              <input
                type="file"
                accept=".db"
                className="hidden"
                onChange={handleImport}
                disabled={importing}
              />
            </label>
          </div>

          <button
            onClick={loadBackups}
            className="w-full py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium mb-2"
          >
            {showBackups ? '收起备份列表' : '📂 查看备份列表'}
          </button>

          {backupMsg && (
            <p className={`text-sm mb-2 ${backupMsg.includes('✅') ? 'text-green-500' : 'text-red-500'}`}>
              {backupMsg}
            </p>
          )}

          {showBackups && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {backups.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">暂无备份</p>
              ) : (
                backups.map(b => (
                  <div
                    key={b.name}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{b.name}</p>
                      <p className="text-xs text-gray-400">
                        {formatTime(b.time)} · {formatSize(b.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestore(b.name)}
                      disabled={restoring === b.name}
                      className="ml-3 px-3 py-1.5 bg-orange-100 text-orange-600 rounded-lg text-xs font-medium disabled:opacity-50 shrink-0"
                    >
                      {restoring === b.name ? '恢复中...' : '恢复'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* 课程推送配置 */}
      {isParentMode && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
          <h3 className="font-medium text-base mb-1">🔔 课程推送（钉钉）</h3>
          <p className="text-sm text-gray-400 mb-3">
            每天推送今日课表 + 上课前 1 小时提醒到钉钉群
          </p>
          <input
            type="text"
            value={pushConfig.webhook}
            onChange={e => setPushConfig({ ...pushConfig, webhook: e.target.value })}
            placeholder="钉钉群机器人 webhook 地址"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label className="flex items-center justify-between py-2 mb-2">
            <span className="text-sm text-gray-600">开启课程推送</span>
            <button
              onClick={() => setPushConfig({ ...pushConfig, enabled: !pushConfig.enabled })}
              className={`w-12 h-7 rounded-full transition-colors ${pushConfig.enabled ? 'bg-blue-500' : 'bg-gray-300'}`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${pushConfig.enabled ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </label>
          <div className="flex gap-2 mb-2">
            <button
              onClick={handleSavePush}
              disabled={pushLoading}
              className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {pushLoading ? '保存中...' : '保存配置'}
            </button>
            <button
              onClick={handleTestPush}
              disabled={testingPush}
              className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {testingPush ? '发送中...' : '测试推送'}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleManualPush}
              disabled={manualPushing}
              className="flex-1 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {manualPushing ? '推送中...' : '📨 今日课表'}
            </button>
            <button
              onClick={handleWeeklyPush}
              disabled={weeklyPushing}
              className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {weeklyPushing ? '推送中...' : '📅 推送7天'}
            </button>
          </div>
          {pushMsg && (
            <p className={`text-sm mt-2 ${pushMsg.includes('✅') ? 'text-green-500' : 'text-red-500'}`}>
              {pushMsg}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-3">
            如何获取 webhook：钉钉群 → 群设置 → 智能群助手 → 添加机器人 → 自定义 → 复制 webhook 地址
          </p>
        </div>
      )}

      {/* 关于 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
        <span className="text-3xl">📚</span>
        <p className="text-sm text-gray-500 mt-2">{formatVersion()}</p>
        <p className="text-xs text-gray-400 mt-1">让孩子养成好习惯 ✨</p>
      </div>
    </div>
  );
}
