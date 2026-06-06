import { useMemo } from 'react';
import {
  X,
  Droplets,
  ArrowDownToLine,
  ArrowUpFromLine,
  Waves,
  Activity,
  ThermometerSun,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useData } from '../context/DataContext';
import { computeReservoirMetrics } from '../utils/dataProcessor';

interface Props {
  reservoirId: string;
  onClose: () => void;
}

export default function ReservoirDetail({ reservoirId, onClose }: Props) {
  const { reservoirs, waterQualityStations, rainfallStations, pumpStations, waterLevelHistory, waterQualityHistory } = useData();

  const reservoir = reservoirs.find(r => r.id === reservoirId);
  const waterQuality = waterQualityStations.find(q => q.reservoirId === reservoirId);
  const rainfall = rainfallStations.find(r => r.reservoirId === reservoirId);
  const pump = pumpStations.find(p => p.reservoirId === reservoirId);
  const levelHistory = waterLevelHistory[reservoirId] || [];
  const qualityHistory = waterQualityHistory[reservoirId] || [];

  const metrics = useMemo(() => {
    if (!reservoir) return null;
    return computeReservoirMetrics(reservoir, rainfall, waterQuality);
  }, [reservoir, rainfall, waterQuality]);

  const trendData = useMemo(() => {
    return levelHistory.map(record => ({
      date: new Date(record.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      水位: Number(record.waterLevel.toFixed(1)),
      死水位: reservoir?.deadWaterLevel || 0,
      汛限水位: reservoir?.floodLimitLevel || 0,
      入库流量: Math.round(record.inflow),
      出库流量: Math.round(record.outflow),
    }));
  }, [levelHistory, reservoir]);

  const qualityData = useMemo(() => {
    return qualityHistory.map(record => ({
      date: new Date(record.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      PH: Number(record.ph.toFixed(2)),
      溶解氧: Number(record.dissolvedOxygen.toFixed(1)),
      COD: Number(record.cod.toFixed(1)),
      氨氮: Number(record.nh3n.toFixed(3)),
      浊度: Number(record.turbidity.toFixed(1)),
    }));
  }, [qualityHistory]);

  if (!reservoir) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="card p-8 text-center">
          <p className="text-slate-300">水库数据加载中...</p>
          <button onClick={onClose} className="btn-secondary mt-4">关闭</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800/95 backdrop-blur-xl border border-slate-700 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Droplets className="w-6 h-6 text-water-400" />
              {reservoir.name}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {reservoir.basin} · {reservoir.province} · 总库容 {(reservoir.capacity / 10000000).toFixed(2)}亿m³
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-5 scrollbar-thin">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-700/40 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Droplets className="w-4 h-4" /> 当前水位
              </div>
              <div className="text-2xl font-bold text-white">
                {reservoir.currentWaterLevel.toFixed(1)}
                <span className="text-sm text-slate-400 ml-1">m</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                死水位 {reservoir.deadWaterLevel.toFixed(1)}m · 汛限 {reservoir.floodLimitLevel.toFixed(1)}m
              </div>
            </div>

            <div className="bg-slate-700/40 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <ArrowDownToLine className="w-4 h-4 text-emerald-400" /> 入库流量
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {Math.round(reservoir.inflow)}
                <span className="text-sm text-slate-400 ml-1">m³/s</span>
              </div>
            </div>

            <div className="bg-slate-700/40 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <ArrowUpFromLine className="w-4 h-4 text-amber-400" /> 出库流量
              </div>
              <div className="text-2xl font-bold text-amber-400">
                {Math.round(reservoir.outflow)}
                <span className="text-sm text-slate-400 ml-1">m³/s</span>
              </div>
            </div>

            <div className="bg-slate-700/40 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Activity className="w-4 h-4 text-water-400" /> 蓄水率
              </div>
              <div className="text-2xl font-bold text-water-400">
                {metrics?.storageRate.toFixed(1) || 0}
                <span className="text-sm text-slate-400 ml-1">%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-600 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    (metrics?.storageRate || 0) > 80
                      ? 'bg-red-500'
                      : (metrics?.storageRate || 0) > 60
                      ? 'bg-orange-500'
                      : 'bg-water-500'
                  }`}
                  style={{ width: `${metrics?.storageRate || 0}%` }}
                />
              </div>
            </div>
          </div>

          {rainfall && (
            <div className="bg-slate-700/30 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <ThermometerSun className="w-4 h-4" /> 雨量监测
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xs text-slate-400">近1小时</div>
                  <div className="text-lg font-bold text-white">{rainfall.rainfall1h.toFixed(1)} mm</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-400">近24小时</div>
                  <div className="text-lg font-bold text-white">{rainfall.rainfall24h.toFixed(1)} mm</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-400">近7日</div>
                  <div className="text-lg font-bold text-white">{rainfall.rainfall7d.toFixed(1)} mm</div>
                </div>
              </div>
            </div>
          )}

          <div className="card p-5">
            <h3 className="text-base font-semibold text-white mb-4">近30天水位趋势</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="levelGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Area type="monotone" dataKey="水位" stroke="#0ea5e9" strokeWidth={2} fill="url(#levelGradient)" />
                <Line type="monotone" dataKey="汛限水位" stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="死水位" stroke="#f59e0b" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h3 className="text-base font-semibold text-white mb-4">出入库流量对比</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Line type="monotone" dataKey="入库流量" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="出库流量" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card p-5">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <Waves className="w-4 h-4 text-water-400" /> 水质参数时间线
              </h3>
              {waterQuality ? (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                    <div className="p-2 bg-slate-700/50 rounded-lg">
                      <span className="text-slate-400">PH值</span>
                      <div className="text-white font-semibold">{waterQuality.ph.toFixed(2)}</div>
                    </div>
                    <div className="p-2 bg-slate-700/50 rounded-lg">
                      <span className="text-slate-400">溶解氧</span>
                      <div className="text-white font-semibold">{waterQuality.dissolvedOxygen.toFixed(1)} mg/L</div>
                    </div>
                    <div className="p-2 bg-slate-700/50 rounded-lg">
                      <span className="text-slate-400">COD</span>
                      <div className="text-white font-semibold">{waterQuality.cod.toFixed(1)} mg/L</div>
                    </div>
                    <div className="p-2 bg-slate-700/50 rounded-lg">
                      <span className="text-slate-400">氨氮</span>
                      <div className="text-white font-semibold">{waterQuality.nh3n.toFixed(3)} mg/L</div>
                    </div>
                  </div>
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    waterQuality.qualityStatus === 'excellent' ? 'bg-emerald-500/20 text-emerald-400' :
                    waterQuality.qualityStatus === 'good' ? 'bg-blue-500/20 text-blue-400' :
                    waterQuality.qualityStatus === 'qualified' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    水质等级: {
                      waterQuality.qualityStatus === 'excellent' ? '优' :
                      waterQuality.qualityStatus === 'good' ? '良' :
                      waterQuality.qualityStatus === 'qualified' ? '合格' : '不合格'
                    }
                  </div>
                </>
              ) : (
                <p className="text-slate-400 text-sm">暂无水质数据</p>
              )}
            </div>

            <div className="card p-5">
              <h3 className="text-base font-semibold text-white mb-4">水质历史趋势</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={qualityData.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} />
                  <Line type="monotone" dataKey="溶解氧" stroke="#0ea5e9" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="PH" stroke="#10b981" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="COD" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {pump && (
            <div className="card p-5">
              <h3 className="text-base font-semibold text-white mb-3">下游泵站状态</h3>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">{pump.name}</div>
                  <div className="text-sm text-slate-400">
                    当前流量 {pump.currentFlow}/{pump.maxCapacity} m³/s
                  </div>
                </div>
                <span className={`badge ${
                  pump.status === 'running' ? 'bg-green-500/20 text-green-400' :
                  pump.status === 'stopped' ? 'bg-slate-500/20 text-slate-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {pump.status === 'running' ? '运行中' : pump.status === 'stopped' ? '已停止' : '维护中'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
