import { useState } from 'react';
import { Shield, Eye, EyeOff, AlertTriangle, Droplets, Waves, Activity } from 'lucide-react';
import { useData } from '../context/DataContext';

const DEMO_USERS = [
  { name: '总部管理员', level: '总部' },
  { name: '长江流域调度员', level: '流域' },
  { name: '三峡水库管理员', level: '水库' },
];

export default function LoginPage() {
  const { login } = useData();
  const [username, setUsername] = useState('总部管理员');
  const [password, setPassword] = useState('123456');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err?.response?.data?.error || '登录失败，请检查用户名密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-water-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center max-w-5xl w-full">
        <div className="hidden md:block space-y-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-water-500 to-cyan-500 flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">全国水资源监测平台</h1>
              <p className="text-slate-400">智能调度分析系统</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight">
            全国水库<br />智能调度<br />
            <span className="text-water-400">水资源健康诊断</span>
          </h2>
          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-water-500/20 flex items-center justify-center">
                <Droplets className="w-5 h-5 text-water-400" />
              </div>
              <div>
                <div className="text-white font-medium">实时多源数据接入</div>
                <div className="text-sm text-slate-400">水位、流量、水质、降雨多维度监测</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Waves className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-white font-medium">智能预警与审批</div>
                <div className="text-sm text-slate-400">三级预警、三层审批流转</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-white font-medium">AI调度推荐</div>
                <div className="text-sm text-slate-400">气象预报径流预测、智能泄洪调水</div>
              </div>
            </div>
          </div>
          </div>

        <div className="card p-8 w-full max-w-md">
          <h3 className="text-xl font-bold text-white mb-2">账号登录</h3>
          <p className="text-sm text-slate-400 mb-6">请输入用户名密码登录系统</p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">用户名</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-water-500 transition-colors"
                placeholder="请输入用户名"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">密码</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-water-500 transition-colors pr-10"
                  placeholder="请输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-water-500 to-cyan-500 hover:from-water-400 hover:to-cyan-400 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? '登录中...' : '登 录'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <div className="text-xs text-slate-400 mb-3">演示账号（密码均为 123456）</div>
            <div className="space-y-2">
              {DEMO_USERS.map(u => (
                <button
                  key={u.name}
                  onClick={() => { setUsername(u.name); setPassword('123456'); }}
                  className="w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm transition-colors flex items-center justify-between"
                >
                  <span className="text-white">{u.name}</span>
                  <span className="text-xs text-water-400">{u.level}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
