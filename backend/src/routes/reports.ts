import { Router, Request, Response } from 'express';
import { findMany, findFirst, insert, remove, nowISO } from '../db';
import { authMiddleware, canViewReservoir } from '../auth';
import { BASINS } from '../utils';

const router = Router();

router.get('/reports/weekly', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const reservoirs = findMany('reservoirs');
  const qualities = findMany('water_quality_stations');
  const qMap = new Map(qualities.map((q: any) => [q.reservoir_id, q]));
  const visible = reservoirs.filter((r: any) => canViewReservoir(user, r.basin, r.id));
  const totalStorage = visible.reduce((s: number, r: any) => s + r.capacity * (r.storage_rate / 100), 0);
  const storageYoY = Math.random() * 20 - 10;
  const filteredQualities = qualities.filter((q: any) => visible.some((r: any) => r.id === q.reservoir_id));
  const totalQuality = filteredQualities.length > 0
    ? (filteredQualities.filter((q: any) => q.quality_status === 'excellent' || q.quality_status === 'good').length / filteredQualities.length) * 100
    : 85;

  const basinStats = BASINS.map(basin => {
    const br = visible.filter((r: any) => r.basin === basin);
    const storage = br.reduce((s: number, r: any) => s + r.capacity * (r.storage_rate / 100), 0);
    const qs = qualities.filter((q: any) => br.some((r: any) => r.id === q.reservoir_id));
    const qualityRate = qs.length > 0
      ? (qs.filter((q: any) => q.quality_status === 'excellent' || q.quality_status === 'good').length / qs.length) * 100
      : 85;
    return { basin, storage, storageChange: Math.random() * 15 - 7.5, qualityRate };
  }).filter(s => s.storage > 0);

  const existing = findMany('weekly_reports').sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const weekStart = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const weekEnd = new Date().toISOString();

  if (existing) {
    return res.json({
      id: existing.id, weekStart: existing.week_start, weekEnd: existing.week_end,
      totalStorage: existing.total_storage, storageYoY: existing.storage_yoy,
      waterQualityRate: existing.water_quality_rate, waterSupplyGuaranteeRate: existing.water_supply_guarantee_rate,
      basinStats: JSON.parse(existing.basin_stats_json || '[]'),
      dispatchStrategies: JSON.parse(existing.dispatch_strategies_json || '[]'),
      emergencyMaterials: JSON.parse(existing.emergency_materials_json || '[]'),
    });
  }

  const id = `WR-${Date.now()}`;
  const dispatchStrategies = [
    '长江流域部分水库蓄水率偏高，建议加强流域内水资源统一调度',
    '黄河流域来水偏少，建议做好抗旱预案准备',
    '珠江流域即将进入汛期，建议加强雨情监测',
    '北方流域建议做好水库联合调度优化',
  ];
  const emergencyMaterials = [
    { name: '冲锋舟', current: 120, recommended: 150 },
    { name: '救生衣', current: 8500, recommended: 10000 },
    { name: '编织袋', current: 45000, recommended: 60000 },
    { name: '砂石料(吨)', current: 2800, recommended: 3500 },
    { name: '排水泵', current: 320, recommended: 400 },
    { name: '发电机组', current: 85, recommended: 100 },
  ];
  insert('weekly_reports', {
    id, week_start: weekStart, week_end: weekEnd, total_storage: totalStorage,
    storage_yoy: storageYoY, water_quality_rate: totalQuality, water_supply_guarantee_rate: 96.5,
    basin_stats_json: JSON.stringify(basinStats),
    dispatch_strategies_json: JSON.stringify(dispatchStrategies),
    emergency_materials_json: JSON.stringify(emergencyMaterials),
    created_at: nowISO(),
  });
  res.json({
    id, weekStart, weekEnd, totalStorage, storageYoY,
    waterQualityRate: totalQuality, waterSupplyGuaranteeRate: 96.5,
    basinStats, dispatchStrategies, emergencyMaterials,
  });
});

router.post('/reports/weekly/generate', authMiddleware, (_req: Request, res: Response) => {
  remove('weekly_reports', () => true);
  res.json({ message: '已触发重新生成' });
});

export default router;
