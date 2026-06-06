import React from 'react';
import {
  LayoutDashboard,
  Map,
  AlertTriangle,
  FileBarChart,
  CloudRain,
  Users,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { USERS, getUserLevelText } from '../utils/permissions';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: '核心看板', icon: LayoutDashboard },
  { id: 'heatmap', label: '蓄水热力图', icon: Map },
  { id: 'alerts', label: '预警与审批', icon: AlertTriangle },
  { id: 'forecast', label: '气象调度', icon: CloudRain },
  { id: 'reports', label: '诊断报告', icon: FileBarChart },
];

export default function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const { user, switchUser, refreshData, alerts, logout } = useData();
  const pendingAlerts = alerts.filter(a => a.status === 'pending' || a.status === 'escalated').length;

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      <aside className="w-64 bg-slate-800/80 border-r border-slate-700/50 flex flex-col">
        <div className="p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-water-500 to-water-700 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">水资源监测平台</h1>
              <p className="text-xs text-slate-400">智能调度分析系统</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-water-600/20 text-water-400 border border-water-500/30'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.id === 'alerts' && pendingAlerts > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {pendingAlerts}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-700/50">
          <button
            onClick={refreshData}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            刷新数据
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-slate-800/50 border-b border-slate-700/50 flex items-center justify-between px-6">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {NAV_ITEMS.find(n => n.id === activeTab)?.label}
            </h2>
            <p className="text-xs text-slate-400">
              全国水资源实时监测 · {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">权限切换:</span>
              <select
                value={user?.id || ''}
                onChange={e => {
                  const u = USERS.find(x => x.id === e.target.value);
                  if (u) {
                    switchUser(u);
                  }
                }}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-water-500"
              >
                {USERS.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({getUserLevelText(u.level)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 px-4 py-2 bg-slate-700/50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-water-400 to-water-600 flex items-center justify-center text-white text-sm font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="text-sm">
                <div className="text-white font-medium">{user?.name}</div>
                <div className="text-slate-400 text-xs">{getUserLevelText(user?.level || 'headquarters')}</div>
              </div>
              <button
                onClick={logout}
                className="ml-2 p-1.5 text-slate-400 hover:text-white hover:bg-slate-600 rounded"
                title="退出登录"
              >
                退出
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
