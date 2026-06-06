import type { Reservoir, RainfallStation, WaterQualityStation, PumpStation, WaterLevelRecord } from '../types';

export interface NormalizedDataPoint {
  timestamp: Date;
  reservoirId: string;
  value: number;
  unit: string;
  quality: 'good' | 'suspicious' | 'bad';
  source: string;
}

export interface ComputedMetrics {
  storageRate: number;
  balanceIndex: number;
  waterQualityRate: number;
  supplyGuaranteeRate: number;
}

export function cleanAndNormalize(value: number, min: number, max: number): { value: number; quality: 'good' | 'suspicious' | 'bad' } {
  if (value === null || value === undefined || isNaN(value)) {
    return { value: 0, quality: 'bad' };
  }
  if (value < min || value > max) {
    return { value: Math.max(min, Math.min(max, value)), quality: 'suspicious' };
  }
  return { value, quality: 'good' };
}

export function normalizeInflow(inflow: number): NormalizedDataPoint {
  const cleaned = cleanAndNormalize(inflow, 0, 10000);
  return {
    timestamp: new Date(),
    reservoirId: '',
    value: cleaned.value,
    unit: 'm³/s',
    quality: cleaned.quality,
    source: 'flow_sensor',
  };
}

export function normalizeWaterLevel(level: number, dead: number, flood: number): NormalizedDataPoint {
  const cleaned = cleanAndNormalize(level, dead - 5, flood + 5);
  return {
    timestamp: new Date(),
    reservoirId: '',
    value: cleaned.value,
    unit: 'm',
    quality: cleaned.quality,
    source: 'water_level_sensor',
  };
}

export function computeStorageRate(currentLevel: number, deadLevel: number, normalLevel: number): number {
  const usable = normalLevel - deadLevel;
  const current = currentLevel - deadLevel;
  return Math.max(0, Math.min(100, (current / usable) * 100));
}

export function computeBalanceIndex(inflow: number, outflow: number): number {
  if (outflow === 0) return inflow > 0 ? 100 : 0;
  const ratio = inflow / outflow;
  return Math.round(ratio * 100) / 100;
}

export function computeWaterQualityRate(qualityStatus: string): number {
  const rates: Record<string, number> = {
    excellent: 100,
    good: 90,
    qualified: 75,
    unqualified: 50,
  };
  return rates[qualityStatus] || 70;
}

export function computeSupplyGuaranteeRate(storageRate: number, demandFulfillment = 95): number {
  if (storageRate >= 60) return Math.min(100, demandFulfillment + 3);
  if (storageRate >= 40) return demandFulfillment;
  if (storageRate >= 20) return demandFulfillment - 10;
  return demandFulfillment - 25;
}

export function computeReservoirMetrics(
  reservoir: Reservoir,
  _rainfall: RainfallStation | undefined,
  waterQuality: WaterQualityStation | undefined
): ComputedMetrics {
  return {
    storageRate: computeStorageRate(reservoir.currentWaterLevel, reservoir.deadWaterLevel, reservoir.normalWaterLevel),
    balanceIndex: computeBalanceIndex(reservoir.inflow, reservoir.outflow),
    waterQualityRate: computeWaterQualityRate(waterQuality?.qualityStatus || 'good'),
    supplyGuaranteeRate: computeSupplyGuaranteeRate(
      computeStorageRate(reservoir.currentWaterLevel, reservoir.deadWaterLevel, reservoir.normalWaterLevel)
    ),
  };
}

export function aggregateByBasin(
  reservoirs: Reservoir[],
  waterQualities: WaterQualityStation[]
): Record<string, ComputedMetrics & { reservoirCount: number; totalCapacity: number }> {
  const basinMap: Record<string, Reservoir[]> = {};

  reservoirs.forEach((r) => {
    if (!basinMap[r.basin]) basinMap[r.basin] = [];
    basinMap[r.basin].push(r);
  });

  const result: Record<string, ComputedMetrics & { reservoirCount: number; totalCapacity: number }> = {};

  Object.keys(basinMap).forEach((basin) => {
    const basinReservoirs = basinMap[basin];
    const qmMap = new Map(waterQualities.filter(q => basinReservoirs.some(r => r.id === q.reservoirId)).map(q => [q.reservoirId, q]));

    let totalStorage = 0;
    let totalBalance = 0;
    let totalQuality = 0;
    let totalSupply = 0;
    let totalCapacity = 0;

    basinReservoirs.forEach((r) => {
      const metrics = computeReservoirMetrics(r, undefined, qmMap.get(r.id));
      totalStorage += metrics.storageRate;
      totalBalance += metrics.balanceIndex;
      totalQuality += metrics.waterQualityRate;
      totalSupply += metrics.supplyGuaranteeRate;
      totalCapacity += r.capacity;
    });

    const n = basinReservoirs.length;
    result[basin] = {
      storageRate: totalStorage / n,
      balanceIndex: totalBalance / n,
      waterQualityRate: totalQuality / n,
      supplyGuaranteeRate: totalSupply / n,
      reservoirCount: n,
      totalCapacity,
    };
  });

  return result;
}

export function aggregateByProvince(
  reservoirs: Reservoir[],
  waterQualities: WaterQualityStation[]
): Record<string, ComputedMetrics & { reservoirCount: number }> {
  const provinceMap: Record<string, Reservoir[]> = {};

  reservoirs.forEach((r) => {
    if (!provinceMap[r.province]) provinceMap[r.province] = [];
    provinceMap[r.province].push(r);
  });

  const result: Record<string, ComputedMetrics & { reservoirCount: number }> = {};

  Object.keys(provinceMap).forEach((province) => {
    const provinceReservoirs = provinceMap[province];
    const qmMap = new Map(waterQualities.filter(q => provinceReservoirs.some(r => r.id === q.reservoirId)).map(q => [q.reservoirId, q]));

    let totalStorage = 0;
    let totalBalance = 0;
    let totalQuality = 0;
    let totalSupply = 0;

    provinceReservoirs.forEach((r) => {
      const metrics = computeReservoirMetrics(r, undefined, qmMap.get(r.id));
      totalStorage += metrics.storageRate;
      totalBalance += metrics.balanceIndex;
      totalQuality += metrics.waterQualityRate;
      totalSupply += metrics.supplyGuaranteeRate;
    });

    const n = provinceReservoirs.length;
    result[province] = {
      storageRate: totalStorage / n,
      balanceIndex: totalBalance / n,
      waterQualityRate: totalQuality / n,
      supplyGuaranteeRate: totalSupply / n,
      reservoirCount: n,
    };
  });

  return result;
}

export function detectOutliers(records: WaterLevelRecord[]): WaterLevelRecord[] {
  if (records.length < 3) return [];

  const values = records.map(r => r.waterLevel);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);

  return records.filter(r => Math.abs(r.waterLevel - mean) > 2 * stdDev);
}
