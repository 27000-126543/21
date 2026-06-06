import { Router, Request, Response } from 'express';
import { findFirst, findMany, insert, update, nowISO } from '../db';
import { authMiddleware, canViewReservoir } from '../auth';
import { computeStorageRate, computeBalanceIndex, getWaterQualityStatus } from '../utils';

const router = Router();

router.get('/reservoirs', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { basin } = req.query;
  let rows = findMany('reservoirs');
  rows = rows.filter((r: any) => canViewReservoir(user, r.basin, r.id));
  if (basin) rows = rows.filter((r: any) => r.basin === basin);
  res.json(rows.map((r: any) => ({
    id: r.id, name: r.name, basin: r.basin, province: r.province,
    capacity: r.capacity, deadWaterLevel: r.dead_water_level,
    floodLimitLevel: r.flood_limit_level, normalWaterLevel: r.normal_water_level,
    currentWaterLevel: r.current_water_level, inflow: r.inflow, outflow: r.outflow,
    storageRate: r.storage_rate, lat: r.lat, lng: r.lng, adminId: r.admin_id,
  })));
});

router.get('/reservoirs/:id', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const row = findFirst('reservoirs', (r: any) => r.id === id);
  if (!row) return res.status(404).json({ error: '水库不存在' });
  const user = (req as any).user;
  if (!canViewReservoir(user, row.basin, row.id)) return res.status(403).json({ error: '无权限查看' });
  res.json({
    id: row.id, name: row.name, basin: row.basin, province: row.province,
    capacity: row.capacity, deadWaterLevel: row.dead_water_level,
    floodLimitLevel: row.flood_limit_level, normalWaterLevel: row.normal_water_level,
    currentWaterLevel: row.current_water_level, inflow: row.inflow, outflow: row.outflow,
    storageRate: row.storage_rate, lat: row.lat, lng: row.lng, adminId: row.admin_id,
  });
});

router.post('/reservoirs/:id/realtime', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const waterLevel = Number(req.body.waterLevel);
  const inflow = Number(req.body.inflow);
  const outflow = Number(req.body.outflow);
  const row = findFirst('reservoirs', (r: any) => r.id === id);
  if (!row) return res.status(404).json({ error: '水库不存在' });
  const storageRate = computeStorageRate(waterLevel, row.dead_water_level, row.normal_water_level);
  update('reservoirs', (r: any) => r.id === id, {
    current_water_level: waterLevel, inflow, outflow, storage_rate: storageRate, updated_at: nowISO(),
  });
  insert('water_level_history', {
    reservoir_id: id, timestamp: nowISO(), water_level: waterLevel, inflow, outflow, storage_rate: storageRate,
  });
  res.json({ success: true, storageRate });
});

router.get('/rainfall-stations', authMiddleware, (_req: Request, res: Response) => {
  res.json(findMany('rainfall_stations').map((r: any) => ({
    id: r.id, name: r.name, reservoirId: r.reservoir_id,
    rainfall1h: r.rainfall_1h, rainfall24h: r.rainfall_24h, rainfall7d: r.rainfall_7d, timestamp: r.timestamp,
  })));
});

router.get('/water-quality-stations', authMiddleware, (_req: Request, res: Response) => {
  res.json(findMany('water_quality_stations').map((r: any) => ({
    id: r.id, name: r.name, reservoirId: r.reservoir_id, ph: r.ph,
    dissolvedOxygen: r.dissolved_oxygen, cod: r.cod, nh3n: r.nh3n, turbidity: r.turbidity,
    qualityStatus: r.quality_status, timestamp: r.timestamp,
  })));
});

router.post('/water-quality-stations/:id/realtime', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const { ph, dissolvedOxygen, cod, nh3n, turbidity, reservoirId } = req.body;
  const qualityStatus = getWaterQualityStatus(ph, dissolvedOxygen, cod, nh3n);
  update('water_quality_stations', (r: any) => r.id === id, {
    ph, dissolved_oxygen: dissolvedOxygen, cod, nh3n, turbidity, quality_status: qualityStatus, timestamp: nowISO(),
  });
  insert('water_quality_history', {
    reservoir_id: reservoirId, timestamp: nowISO(), ph, dissolved_oxygen: dissolvedOxygen, cod, nh3n, turbidity,
  });
  res.json({ success: true, qualityStatus });
});

router.get('/pump-stations', authMiddleware, (_req: Request, res: Response) => {
  res.json(findMany('pump_stations').map((r: any) => ({
    id: r.id, name: r.name, reservoirId: r.reservoir_id,
    downstreamReservoirId: r.downstream_reservoir_id, currentFlow: r.current_flow,
    maxCapacity: r.max_capacity, status: r.status, timestamp: r.timestamp,
  })));
});

router.get('/reservoirs/:id/water-level-history', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const days = Number(req.query.days || 30);
  const rows = findMany('water_level_history', (h: any) => h.reservoir_id === id)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-days);
  res.json(rows.map((r: any) => ({
    timestamp: r.timestamp, waterLevel: r.water_level, inflow: r.inflow,
    outflow: r.outflow, storageRate: r.storage_rate,
  })));
});

router.get('/reservoirs/:id/water-quality-history', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const days = Number(req.query.days || 30);
  const rows = findMany('water_quality_history', (h: any) => h.reservoir_id === id)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-days);
  res.json(rows.map((r: any) => ({
    timestamp: r.timestamp, ph: r.ph, dissolvedOxygen: r.dissolved_oxygen,
    cod: r.cod, nh3n: r.nh3n, turbidity: r.turbidity,
  })));
});

router.get('/metrics/aggregate', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const groupBy = (req.query.groupBy as 'basin' | 'province') || 'basin';
  const reservoirs = findMany('reservoirs');
  const qualities = findMany('water_quality_stations');
  const qMap = new Map(qualities.map((q: any) => [q.reservoir_id, q]));

  const groups: Record<string, any> = {};
  reservoirs.forEach((r: any) => {
    if (!canViewReservoir(user, r.basin, r.id)) return;
    const key = groupBy === 'province' ? r.province : r.basin;
    if (!groups[key]) groups[key] = { storageRate: 0, balance: 0, quality: 0, supply: 0, count: 0, capacity: 0 };
    const q = qMap.get(r.id);
    const storage = r.storage_rate;
    const balance = computeBalanceIndex(r.inflow, r.outflow);
    let quality = 85;
    if (q) {
      if (q.quality_status === 'excellent' || q.quality_status === 'good') quality = 100;
      else if (q.quality_status === 'qualified') quality = 75;
      else quality = 50;
    }
    const supply = storage >= 60 ? 98 : storage >= 40 ? 95 : storage >= 20 ? 85 : 70;
    groups[key].storageRate += storage;
    groups[key].balance += balance;
    groups[key].quality += quality;
    groups[key].supply += supply;
    groups[key].count++;
    groups[key].capacity += r.capacity;
  });

  const result = Object.entries(groups).map(([name, g]: [string, any]) => ({
    [groupBy === 'province' ? 'province' : 'basin']: name,
    storageRate: g.storageRate / g.count, balanceIndex: g.balance / g.count,
    waterQualityRate: g.quality / g.count, supplyGuaranteeRate: g.supply / g.count,
    reservoirCount: g.count, totalCapacity: g.capacity,
  }));
  res.json(result);
});

export default router;
