import { useState, useMemo } from 'react';
import {
  Droplets,
  Activity,
  Waves,
  Gauge,
  ChevronDown,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useData } from '../context/DataContext';
import StatCard from './StatCard';
import { aggregateByBasin, computeReservoirMetrics } from '../utils/dataProcessor';
import type { Basin } from '../types';

const ALL_BASINS: Basin[] = ['长江流域', '黄河流域', '珠江流域', '淮河流域', '海河流域', '松花江流域', '辽河流域'];
const BASIN_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

export default function Dashboard({ onReservoirClick }: { onReservoirClick: (id: string) => void }) {
  const {
    filteredReservoirs,
    waterQualityStations,
    user,
  } = useData();

  const [selectedBasin, setSelectedBasin] = useState<Basin | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [basinDropdownOpen, setBasinDropdownOpen] = useState(false);

  const availableBasins = useMemo(() => {
    if (!user || user.level === 'headquarters') return ALL_BASINS;
    return user.basin ? [user.basin] : ALL_BASINS;
  }, [user]);

  const displayReservoirs = useMemo(() => {
    if (selectedBasin === 'all') return filteredReservoirs;
    return filteredReservoirs.filter(r => r.basin === selectedBasin);
  }, [filteredReservoirs, selectedBasin]);

  const basinStats = useMemo(() => aggregateByBasin(filteredReservoirs, waterQualityStations), [filteredReservoirs, waterQualityStations]);

  const overallMetrics = useMemo(() => {
    if (displayReservoirs.length === 0) return { storage: 0, balance: 0, quality: 0, supply: 0 };

    let totalStorage = 0;
    let totalBalance = 0;
    let totalQuality = 0;
    let totalSupply = 0;

    displayReservoirs.forEach(r => {
      const wq = waterQualityStations.find(q => q.reservoirId === r.id);
      const metrics = computeReservoirMetrics(r, undefined, wq);
      totalStorage += metrics.storageRate;
      totalBalance += metrics.balanceIndex;
      totalQuality += metrics.waterQualityRate;
      totalSupply += metrics.supplyGuaranteeRate;
    });

    const n = displayReservoirs.length;
    return {
      storage: totalStorage / n,
      balance: totalBalance / n,
      quality: totalQuality / n,
      supply: totalSupply / n,
    };
  }, [displayReservoirs, waterQualityStations]);

  const balanceRanking = useMemo(() => {
    return displayReservoirs
      .map(r => {
        const wq = waterQualityStations.find(q => q.reservoirId === r.id);
        const metrics = computeReservoirMetrics(r, undefined, wq);
        return {
          id: r.id,
          name: r.name,
          basin: r.basin,
          balance: metrics.balanceIndex,
          storage: metrics.storageRate,
          supply: metrics.supplyGuaranteeRate,
        };
      })
      .sort((a, b) => b.balance - a.balance);
  }, [displayReservoirs, waterQualityStations]);

  const basinChartData = useMemo(() => {
    return availableBasins.map(basin => ({
      name: basin.replace('流域', ''),
      蓄水率: basinStats[basin]?.storageRate || 0,
      水质达标率: basinStats[basin]?.waterQualityRate || 0,
      供水保证率: basinStats[basin]?.supplyGuaranteeRate || 90,
    }));
  }, [availableBasins, basinStats]);

  const qualityPieData = useMemo(() => {
    const counts = { excellent: 0, good: 0, qualified: 0, unqualified: 0 };
    displayReservoirs.forEach(r => {
      const wq = waterQualityStations.find(q => q.reservoirId === r.id);
      if (wq) counts[wq.qualityStatus]++;
    });
    return [
      { name: '优', value: counts.excellent, color: '#10b981' },
      { name: '良', value: counts.good, color: '#3b82f6' },
      { name: '合格', value: counts.qualified, color: '#f59e0b' },
      { name: '不合格', value: counts.unqualified, color: '#ef4444' },
    ].filter(d => d.value > 0);
  }, [displayReservoirs, waterQualityStations]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setBasinDropdownOpen(!basinDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white hover:border-water-500 transition-colors"
            >
              {selectedBasin === 'all' ? '全部流域' : selectedBasin}
              <ChevronDown className="w-4 h-4" />
            </button>
            {basinDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 overflow-hidden">
                <button
                  onClick={() => {
                    setSelectedBasin('all');
                    setBasinDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-700 ${selectedBasin === 'all' ? 'text-water-400 bg-slate-700/50' : 'text-slate-200'}`}
                >
                  全部流域
                </button>
                {availableBasins.map(basin => (
                  <button
                    key={basin}
                    onClick={() => {
                      setSelectedBasin(basin);
                      setBasinDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-700 ${selectedBasin === basin ? 'text-water-400 bg-slate-700/50' : 'text-slate-200'}`}
                  >
                    {basin}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="text-sm text-slate-400">
          当前显示 <span className="text-water-400 font-bold">{displayReservoirs.length}</span> 座水库数据
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="平均蓄水率"
          value={overallMetrics.storage.toFixed(1)}
          unit="%"
          icon={<Droplets className="w-5 h-5" />}
          color="blue"
          change={2.3}
          description="较上周"
        />
        <StatCard
          title="出入库平衡指数"
          value={overallMetrics.balance.toFixed(2)}
          icon={<Activity className="w-5 h-5" />}
          color="green"
          change={-0.15}
          description="较上周"
        />
        <StatCard
          title="水质达标率"
          value={overallMetrics.quality.toFixed(1)}
          unit="%"
          icon={<Waves className="w-5 h-5" />}
          color="purple"
          change={1.2}
          description="较上周"
        />
        <StatCard
          title="供水保证率"
          value={overallMetrics.supply.toFixed(1)}
          unit="%"
          icon={<Gauge className="w-5 h-5" />}
          color="yellow"
          change={0.5}
          description="较上周"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">各流域指标对比</h3>
            <span className="text-xs text-slate-400">单位: %</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={basinChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Bar dataKey="蓄水率" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              <Bar dataKey="水质达标率" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="供水保证率" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-base font-semibold text-white mb-4">水质分布</h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={qualityPieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {qualityPieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">水库供需平衡排名</h3>
          <span className="text-xs text-slate-400">点击水库查看详情</span>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-700">
                <th className="pb-3 pr-4 font-medium">排名</th>
                <th className="pb-3 pr-4 font-medium">水库名称</th>
                <th className="pb-3 pr-4 font-medium">所属流域</th>
                <th className="pb-3 pr-4 font-medium">蓄水率(%)</th>
                <th className="pb-3 pr-4 font-medium">平衡指数</th>
                <th className="pb-3 pr-4 font-medium">供水保证率(%)</th>
                <th className="pb-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {balanceRanking.slice(0, 10).map((item, idx) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-800 hover:bg-slate-700/30 transition-colors"
                >
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        idx === 0
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : idx === 1
                          ? 'bg-slate-400/20 text-slate-300'
                          : idx === 2
                          ? 'bg-amber-600/20 text-amber-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-white font-medium">{item.name}</td>
                  <td className="py-3 pr-4 text-slate-300">{item.basin}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-water-500 rounded-full"
                          style={{ width: `${item.storage}%` }}
                        />
                      </div>
                      <span className="text-slate-300">{item.storage.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className={`py-3 pr-4 font-medium ${
                    item.balance > 1.1 ? 'text-emerald-400' : item.balance < 0.9 ? 'text-red-400' : 'text-white'
                  }`}>
                    {item.balance.toFixed(2)}
                  </td>
                  <td className="py-3 pr-4 text-slate-300">{item.supply.toFixed(1)}</td>
                  <td className="py-3">
                    <button
                      onClick={() => onReservoirClick(item.id)}
                      className="flex items-center gap-1 text-water-400 hover:text-water-300 text-xs font-medium"
                    >
                      详情 <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
