import { useState, useRef } from 'react';
import {
  CloudRain,
  Upload,
  FileSpreadsheet,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Droplets,
  Sun,
  Cloud,
  CloudLightning,
  Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';
import { parseWeatherExcel } from '../utils/dispatchAndReport';
import type { WeatherForecast } from '../types';
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

export default function ForecastDispatch() {
  const { reservoirs, weatherForecasts, setWeatherForecasts, dispatchRecommendations } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        const forecasts = parseWeatherExcel(jsonData);

        if (forecasts.length === 0) {
          setUploadError('无法解析Excel文件，请确保包含日期、降雨量等列');
        } else {
          setWeatherForecasts(forecasts);
        }
      } catch (err) {
        setUploadError('文件解析失败，请检查文件格式');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const loadSampleData = () => {
    const sample: WeatherForecast[] = [];
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      sample.push({
        date,
        rainfall: [12, 45, 78][i] || 20 + Math.random() * 30,
        temperature: 20 + Math.random() * 10,
        humidity: 60 + Math.random() * 30,
      });
    }
    setWeatherForecasts(sample);
  };

  const forecastChartData = weatherForecasts.map((f) => ({
    date: new Date(f.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    rainfall: Number(f.rainfall.toFixed(1)),
    temperature: Number(f.temperature.toFixed(0)),
    humidity: Number(f.humidity.toFixed(0)),
  }));

  const getWeatherIcon = (rainfall: number) => {
    if (rainfall > 50) return <CloudLightning className="w-5 h-5 text-purple-400" />;
    if (rainfall > 20) return <CloudRain className="w-5 h-5 text-water-400" />;
    if (rainfall > 5) return <Cloud className="w-5 h-5 text-slate-400" />;
    return <Sun className="w-5 h-5 text-yellow-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-water-400" />
            气象预报数据导入
          </h3>
          <button onClick={loadSampleData} className="btn-secondary text-sm">
            加载示例数据
          </button>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-water-500 hover:bg-slate-800/30 transition-all"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Upload className="w-10 h-10 mx-auto mb-3 text-slate-400" />
          <p className="text-white font-medium">点击或拖拽Excel文件到此处</p>
          <p className="text-sm text-slate-400 mt-1">
            支持 .xlsx, .xls 格式，包含日期、降雨量、温度、湿度列
          </p>
          {uploading && <p className="text-sm text-water-400 mt-2">正在解析...</p>}
          {uploadError && <p className="text-sm text-red-400 mt-2">{uploadError}</p>}
        </div>
      </div>

      {weatherForecasts.length > 0 && (
        <>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-water-400" />
                未来72小时降雨预报
              </h3>
              <span className="text-xs text-slate-400">共 {weatherForecasts.length} 条预报数据</span>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
              {weatherForecasts.slice(0, 6).map((f, idx) => (
                <div key={idx} className="bg-slate-700/30 rounded-xl p-3 text-center">
                  <div className="flex justify-center mb-2">{getWeatherIcon(f.rainfall)}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(f.date).toLocaleDateString('zh-CN', {
                      month: 'numeric',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="text-white font-bold text-lg">{f.rainfall.toFixed(1)} mm</div>
                  <div className="text-xs text-slate-400">降雨</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {f.temperature.toFixed(0)}°C · {f.humidity.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm text-slate-300 mb-2">降雨量趋势</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={forecastChartData}>
                    <defs>
                      <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="rainfall"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      fill="url(#rainGradient)"
                      name="降雨量(mm)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="text-sm text-slate-300 mb-2">温度与湿度</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={forecastChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line
                      type="monotone"
                      dataKey="temperature"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      name="温度(°C)"
                    />
                    <Line
                      type="monotone"
                      dataKey="humidity"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                      name="湿度(%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-water-400" />
                智能调度推荐
              </h3>
              <span className="text-xs text-slate-400">
                {dispatchRecommendations.length > 0
                  ? `共 ${dispatchRecommendations.length} 条推荐`
                  : '暂无推荐'}
              </span>
            </div>

            {dispatchRecommendations.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <Info className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>暂无调度建议</p>
                <p className="text-sm mt-1">系统运行正常，无需调度</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dispatchRecommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className={`p-4 rounded-xl border ${
                      rec.priority === 'high'
                        ? 'bg-red-500/10 border-red-500/30'
                        : rec.priority === 'medium'
                        ? 'bg-orange-500/10 border-orange-500/30'
                        : 'bg-slate-700/30 border-slate-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          rec.type === 'flood_release'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-water-500/20 text-water-400'
                        }`}
                      >
                        {rec.type === 'flood_release' ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <ArrowRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-medium">{rec.reservoirName}</span>
                          <span
                            className={`badge ${
                              rec.priority === 'high'
                                ? 'bg-red-500/20 text-red-400'
                                : rec.priority === 'medium'
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'bg-slate-500/20 text-slate-400'
                            }`}
                          >
                            {rec.priority === 'high'
                              ? '高优先级'
                              : rec.priority === 'medium'
                              ? '中优先级'
                              : '低优先级'}
                          </span>
                          <span className="badge bg-water-500/20 text-water-400">
                            {rec.type === 'flood_release' ? '泄洪调度' : '跨流域调水'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 mt-1.5">{rec.riskAssessment}</p>
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div className="bg-slate-800/50 rounded-lg p-2">
                            <div className="text-slate-400">预测入库流量</div>
                            <div className="text-white font-semibold">{rec.predictedInflow} m³/s</div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-2">
                            <div className="text-slate-400">推荐出库</div>
                            <div className="text-white font-semibold">{rec.recommendedOutflow} m³/s</div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-2">
                            <div className="text-slate-400">预计持续</div>
                            <div className="text-white font-semibold">{rec.estimatedDuration} 小时</div>
                          </div>
                          {rec.targetReservoirName && (
                            <div className="bg-slate-800/50 rounded-lg p-2">
                              <div className="text-slate-400">目标水库</div>
                              <div className="text-white font-semibold flex items-center gap-1">
                                <ArrowRight className="w-3 h-3" />
                                {rec.targetReservoirName}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <button className="btn-primary text-xs px-3 py-1.5">执行调度方案</button>
                          <button className="btn-secondary text-xs px-3 py-1.5">查看详情</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
