import { FileText, Download, TrendingUp, TrendingDown, AlertTriangle, Package, Lightbulb } from 'lucide-react';
import { useData } from '../context/DataContext';
import StatCard from './StatCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function WeeklyReportView() {
  const { weeklyReport } = useData();

  if (!weeklyReport) {
    return (
      <div className="card p-8 text-center text-slate-400">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>正在生成诊断报告...</p>
      </div>
    );
  }

  const basinChartData = weeklyReport.basinStats.map((stat) => ({
    name: stat.basin.replace('流域', ''),
    蓄水量: Number((stat.storage / 10000000).toFixed(2)),
    变化率: Number(stat.storageChange.toFixed(1)),
    水质达标率: Number(stat.qualityRate.toFixed(1)),
  }));

  const formatDate = (date: Date) =>
    date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-water-400" />
            水资源健康诊断周报
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {formatDate(weeklyReport.weekStart)} - {formatDate(weeklyReport.weekEnd)}
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" />
          导出PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总蓄水量"
          value={(weeklyReport.totalStorage / 10000000).toFixed(1)}
          unit="亿m³"
          change={weeklyReport.storageYoY}
          description="同比"
          icon={<TrendingUp className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="水质达标率"
          value={weeklyReport.waterQualityRate.toFixed(1)}
          unit="%"
          change={2.1}
          description="较上周"
          icon={<FileText className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="供水保证率"
          value={weeklyReport.waterSupplyGuaranteeRate.toFixed(1)}
          unit="%"
          change={0.3}
          description="较上周"
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="预警水库数"
          value={3}
          unit="座"
          change={-1}
          description="较上周"
          icon={<AlertTriangle className="w-5 h-5" />}
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-base font-semibold text-white mb-4">各流域蓄水量对比</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={basinChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Bar dataKey="蓄水量" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="蓄水量(亿m³)" />
              <Bar dataKey="水质达标率" fill="#10b981" radius={[4, 4, 0, 0]} name="水质达标率(%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-base font-semibold text-white mb-4">各流域蓄水量变化趋势</h3>
          <div className="space-y-3">
            {weeklyReport.basinStats.map((stat) => (
              <div
                key={stat.basin}
                className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg"
              >
                <div>
                  <div className="text-white font-medium">{stat.basin}</div>
                  <div className="text-xs text-slate-400">
                    蓄水量 {(stat.storage / 10000000).toFixed(2)} 亿m³ · 水质达标率{' '}
                    {stat.qualityRate.toFixed(1)}%
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1 text-sm font-medium ${
                    stat.storageChange > 0
                      ? 'text-emerald-400'
                      : stat.storageChange < 0
                      ? 'text-red-400'
                      : 'text-slate-400'
                  }`}
                >
                  {stat.storageChange > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : stat.storageChange < 0 ? (
                    <TrendingDown className="w-4 h-4" />
                  ) : null}
                  {Math.abs(stat.storageChange).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            调度策略建议
          </h3>
          <div className="space-y-3">
            {weeklyReport.dispatchStrategies.map((strategy, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
              >
                <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-yellow-400 text-xs font-bold">{idx + 1}</span>
                </div>
                <p className="text-sm text-slate-200">{strategy}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-water-400" />
            应急物资调配方案
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700">
                  <th className="pb-3 pr-4 font-medium">物资名称</th>
                  <th className="pb-3 pr-4 font-medium">当前库存</th>
                  <th className="pb-3 pr-4 font-medium">建议储备</th>
                  <th className="pb-3 font-medium">补充建议</th>
                </tr>
              </thead>
              <tbody>
                {weeklyReport.emergencyMaterials.map((material) => {
                  const gap = material.recommended - material.current;
                  const rate = (material.current / material.recommended) * 100;
                  return (
                    <tr
                      key={material.name}
                      className="border-b border-slate-800"
                    >
                      <td className="py-3 pr-4 text-white font-medium">{material.name}</td>
                      <td className="py-3 pr-4 text-slate-300">{material.current.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-slate-300">{material.recommended.toLocaleString()}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                rate >= 100
                                  ? 'bg-green-500'
                                  : rate >= 80
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, rate)}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-medium ${
                              gap > 0 ? 'text-red-400' : 'text-green-400'
                            }`}
                          >
                            {gap > 0 ? `+${gap.toLocaleString()}` : '充足'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-base font-semibold text-white mb-4">报告摘要</h3>
        <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
          <p>
            本周全国水资源整体运行平稳。监测范围内水库总蓄水量达
            <span className="text-water-400 font-semibold">
              {' '}
              {(weeklyReport.totalStorage / 10000000).toFixed(2)} 亿立方米
            </span>
            ，同比
            {weeklyReport.storageYoY >= 0 ? (
              <span className="text-emerald-400">上升 {weeklyReport.storageYoY.toFixed(1)}%</span>
            ) : (
              <span className="text-red-400">下降 {Math.abs(weeklyReport.storageYoY).toFixed(1)}%</span>
            )}
            。
          </p>
          <p>
            全国水质达标率为
            <span className="text-emerald-400 font-semibold">
              {' '}
              {weeklyReport.waterQualityRate.toFixed(1)}%
            </span>
            ，供水保证率保持在
            <span className="text-water-400 font-semibold">
              {' '}
              {weeklyReport.waterSupplyGuaranteeRate.toFixed(1)}%
            </span>{' '}
            的较高水平。
          </p>
          <p>
            建议重点关注
            {weeklyReport.basinStats
              .filter((s) => s.storageChange < -3)
              .map((s) => s.basin)
              .join('、') || '长江流域和黄河流域'}
            的蓄水变化趋势，加强流域联合调度能力，确保汛期防洪和枯水期供水安全。
          </p>
        </div>
      </div>
    </div>
  );
}
