import { useState, useMemo } from 'react';
import { MapPin, Droplets, ChevronRight } from 'lucide-react';
import { useData } from '../context/DataContext';
import type { Reservoir, Basin } from '../types';

const BASINS: Basin[] = ['长江流域', '黄河流域', '珠江流域', '淮河流域', '海河流域', '松花江流域', '辽河流域'];

function getStorageColor(rate: number): string {
  if (rate >= 80) return 'bg-red-500';
  if (rate >= 60) return 'bg-orange-500';
  if (rate >= 40) return 'bg-yellow-500';
  if (rate >= 20) return 'bg-green-500';
  return 'bg-cyan-500';
}

function getStorageColorText(rate: number): string {
  if (rate >= 80) return 'text-red-400';
  if (rate >= 60) return 'text-orange-400';
  if (rate >= 40) return 'text-yellow-400';
  if (rate >= 20) return 'text-green-400';
  return 'text-cyan-400';
}

export default function HeatmapView({ onReservoirClick }: { onReservoirClick: (id: string) => void }) {
  const { filteredReservoirs } = useData();
  const [selectedBasin, setSelectedBasin] = useState<Basin | 'all'>('all');
  const [hoveredReservoir, setHoveredReservoir] = useState<Reservoir | null>(null);

  const displayReservoirs = useMemo(() => {
    if (selectedBasin === 'all') return filteredReservoirs;
    return filteredReservoirs.filter(r => r.basin === selectedBasin);
  }, [filteredReservoirs, selectedBasin]);

  const basinStats = useMemo(() => {
    const stats: Record<string, { count: number; avgStorage: number; totalCapacity: number }> = {};
    filteredReservoirs.forEach(r => {
      if (!stats[r.basin]) {
        stats[r.basin] = { count: 0, avgStorage: 0, totalCapacity: 0 };
      }
      stats[r.basin].count++;
      stats[r.basin].avgStorage += r.storageRate;
      stats[r.basin].totalCapacity += r.capacity;
    });
    Object.keys(stats).forEach(k => {
      stats[k].avgStorage /= stats[k].count;
    });
    return stats;
  }, [filteredReservoirs]);

  const mapReservoirs = displayReservoirs.map(r => {
    const x = ((r.lng - 73) / (135 - 73)) * 100;
    const y = ((54 - r.lat) / (54 - 18)) * 100;
    return { ...r, x, y };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
      <div className="lg:col-span-3 card p-5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">全国水库蓄水热力图</h3>
          <div className="flex items-center gap-2">
            {['all', ...BASINS].map(basin => (
              <button
                key={basin}
                onClick={() => setSelectedBasin(basin as Basin | 'all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedBasin === basin
                    ? 'bg-water-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {basin === 'all' ? '全部' : basin.replace('流域', '')}
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex-1 min-h-[500px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl overflow-hidden border border-slate-700/50">
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#334155" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-400 mr-2">蓄水率:</span>
              {[
                { label: '≤20%', color: 'bg-cyan-500' },
                { label: '20-40%', color: 'bg-green-500' },
                { label: '40-60%', color: 'bg-yellow-500' },
                { label: '60-80%', color: 'bg-orange-500' },
                { label: '>80%', color: 'bg-red-500' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-sm ${item.color}`} />
                  <span className="text-[10px] text-slate-300">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {mapReservoirs.map(r => (
            <div
              key={r.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              style={{ left: `${r.x}%`, top: `${r.y}%` }}
              onMouseEnter={() => setHoveredReservoir(r)}
              onMouseLeave={() => setHoveredReservoir(null)}
              onClick={() => onReservoirClick(r.id)}
            >
              <div
                className={`w-3 h-3 rounded-full ${getStorageColor(r.storageRate)} shadow-lg ring-2 ring-white/20 group-hover:scale-150 group-hover:ring-water-400 transition-all animate-pulse-slow`}
              />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {r.name}
              </div>
            </div>
          ))}

          {hoveredReservoir && (
            <div
              className="absolute z-20 bg-slate-800/95 backdrop-blur border border-slate-600 rounded-xl p-4 shadow-2xl min-w-[220px] pointer-events-none"
              style={{
                left: `${Math.min(85, ((hoveredReservoir.lng - 73) / (135 - 73)) * 100)}%`,
                top: `${Math.min(70, ((54 - hoveredReservoir.lat) / (54 - 18)) * 100)}%`,
                transform: 'translate(-50%, -120%)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-water-400" />
                <span className="font-semibold text-white">{hoveredReservoir.name}</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">流域</span>
                  <span className="text-slate-200">{hoveredReservoir.basin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">省份</span>
                  <span className="text-slate-200">{hoveredReservoir.province}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">当前水位</span>
                  <span className="text-slate-200">{hoveredReservoir.currentWaterLevel.toFixed(1)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">汛限水位</span>
                  <span className="text-slate-200">{hoveredReservoir.floodLimitLevel.toFixed(1)}m</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">蓄水率</span>
                  <span className={`font-bold ${getStorageColorText(hoveredReservoir.storageRate)}`}>
                    {hoveredReservoir.storageRate.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-end gap-1 text-xs text-water-400">
                点击查看详情 <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Droplets className="w-4 h-4 text-water-400" />
            流域统计
          </h3>
          <div className="space-y-3">
            {BASINS.filter(b => basinStats[b]).map(basin => {
              const stat = basinStats[basin];
              return (
                <div
                  key={basin}
                  onClick={() => setSelectedBasin(basin)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedBasin === basin
                      ? 'bg-water-600/20 border-water-500/50'
                      : 'bg-slate-700/30 border-slate-700 hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{basin}</span>
                    <span className="text-xs text-slate-400">{stat.count}座</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getStorageColor(stat.avgStorage)}`}
                        style={{ width: `${stat.avgStorage}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${getStorageColorText(stat.avgStorage)}`}>
                      {stat.avgStorage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-base font-semibold text-white mb-3">高风险水库预警</h3>
          <div className="space-y-2">
            {filteredReservoirs
              .filter(r => r.currentWaterLevel > r.floodLimitLevel || r.currentWaterLevel < r.deadWaterLevel)
              .slice(0, 5)
              .map(r => (
                <div
                  key={r.id}
                  onClick={() => onReservoirClick(r.id)}
                  className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg cursor-pointer hover:bg-red-500/20 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white font-medium">{r.name}</span>
                    <span className={`text-xs ${r.currentWaterLevel > r.floodLimitLevel ? 'text-red-400' : 'text-orange-400'}`}>
                      {r.currentWaterLevel > r.floodLimitLevel ? '超汛限' : '低于死水位'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {r.currentWaterLevel.toFixed(1)}m / 汛限 {r.floodLimitLevel.toFixed(1)}m
                  </div>
                </div>
              ))}
            {filteredReservoirs.filter(r => r.currentWaterLevel > r.floodLimitLevel || r.currentWaterLevel < r.deadWaterLevel).length === 0 && (
              <div className="text-center py-4 text-slate-500 text-sm">暂无风险水库</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
