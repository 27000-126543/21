import type { Reservoir, WeatherForecast, DispatchRecommendation, WeeklyReport, Basin, WaterQualityStation } from '../types';

export function parseWeatherExcel(data: any[][]): WeatherForecast[] {
  const forecasts: WeatherForecast[] = [];
  if (!data || data.length < 2) return forecasts;

  const headers = data[0]?.map((h: any) => String(h).toLowerCase().trim());
  const dateIdx = headers.findIndex((h: string) => h.includes('日期') || h.includes('date'));
  const rainIdx = headers.findIndex((h: string) => h.includes('降雨') || h.includes('rain'));
  const tempIdx = headers.findIndex((h: string) => h.includes('温度') || h.includes('temp'));
  const humIdx = headers.findIndex((h: string) => h.includes('湿度') || h.includes('humidity'));

  for (let i = 1; i < Math.min(data.length, 8); i++) {
    const row = data[i];
    if (!row) continue;

    const dateVal = row[dateIdx >= 0 ? dateIdx : 0];
    const rainVal = parseFloat(row[rainIdx >= 0 ? rainIdx : 1]) || 0;
    const tempVal = parseFloat(row[tempIdx >= 0 ? tempIdx : 2]) || 25;
    const humVal = parseFloat(row[humIdx >= 0 ? humIdx : 3]) || 70;

    forecasts.push({
      date: dateVal instanceof Date ? dateVal : new Date(String(dateVal)),
      rainfall: rainVal,
      temperature: tempVal,
      humidity: humVal,
    });
  }

  return forecasts;
}

function calculateRunoffCoefficient(basin: Basin): number {
  const coefficients: Record<Basin, number> = {
    '长江流域': 0.65,
    '黄河流域': 0.45,
    '珠江流域': 0.7,
    '淮河流域': 0.55,
    '海河流域': 0.4,
    '松花江流域': 0.5,
    '辽河流域': 0.48,
  };
  return coefficients[basin] || 0.5;
}

export function predictInflow(reservoir: Reservoir, forecasts: WeatherForecast[]): number {
  if (forecasts.length === 0) return reservoir.inflow;

  const coefficient = calculateRunoffCoefficient(reservoir.basin);
  let totalRainfall = forecasts.reduce((sum, f) => sum + f.rainfall, 0);
  const avgRainfall = totalRainfall / forecasts.length;

  const catchmentArea = reservoir.capacity / 50;
  const predictedInflow = reservoir.inflow * (1 + (avgRainfall * coefficient * catchmentArea * 0.001));

  return Math.round(predictedInflow);
}

export function generateDispatchRecommendations(
  reservoirs: Reservoir[],
  forecasts: WeatherForecast[]
): DispatchRecommendation[] {
  const recommendations: DispatchRecommendation[] = [];

  reservoirs.forEach((reservoir) => {
    const predictedInflow = predictInflow(reservoir, forecasts);
    const floodCapacity = reservoir.capacity * 0.9;
    const currentStorage = reservoir.capacity * (reservoir.storageRate / 100);
    const predictedStorage = currentStorage + predictedInflow * 72 * 3600;

    const availableCapacity = floodCapacity - currentStorage;
    const excess = predictedStorage - floodCapacity;

    if (predictedStorage > floodCapacity) {
      if (excess / reservoir.capacity > 0.1) {
        const downstreamReservoir = findDownstreamReservoir(reservoir, reservoirs);

        if (downstreamReservoir) {
          const targetStorage = downstreamReservoir.capacity * (downstreamReservoir.storageRate / 100);
          const targetAvailable = downstreamReservoir.capacity * 0.85 - targetStorage;

          if (targetAvailable > excess * 0.5) {
            recommendations.push({
              id: `DR${Date.now()}-${reservoir.id}`,
              reservoirId: reservoir.id,
              reservoirName: reservoir.name,
              type: 'inter_basin_transfer',
              priority: 'high',
              predictedInflow,
              recommendedOutflow: Math.round(excess / (72 * 3600)),
              targetReservoirId: downstreamReservoir.id,
              targetReservoirName: downstreamReservoir.name,
              estimatedDuration: 48,
              expectedStorage: Math.round(currentStorage + predictedInflow * 72 * 3600 - excess * 0.6),
              riskAssessment: `预计72小时内蓄水量将超过防洪库容${((excess / reservoir.capacity) * 100).toFixed(1)}%，建议向${downstreamReservoir.name}跨流域调水${(excess * 0.6 / 10000000).toFixed(2)}亿方`,
              createdAt: new Date(),
            });
          } else {
            recommendations.push({
              id: `DR${Date.now()}-${reservoir.id}`,
              reservoirId: reservoir.id,
              reservoirName: reservoir.name,
              type: 'flood_release',
              priority: 'high',
              predictedInflow,
              recommendedOutflow: Math.round(excess / (72 * 3600) + reservoir.outflow * 1.5),
              estimatedDuration: 36,
              expectedStorage: Math.round(floodCapacity * 0.8),
              riskAssessment: `预计72小时内蓄水量将超过防洪库容${((excess / reservoir.capacity) * 100).toFixed(1)}%，下游调水目标水库库容不足，建议启动泄洪预案`,
              createdAt: new Date(),
            });
          }
        }
      } else if (excess / reservoir.capacity > 0.05) {
        recommendations.push({
          id: `DR${Date.now()}-${reservoir.id}`,
          reservoirId: reservoir.id,
          reservoirName: reservoir.name,
          type: 'flood_release',
          priority: 'medium',
          predictedInflow,
          recommendedOutflow: Math.round(excess / (48 * 3600) + reservoir.outflow * 1.2),
          estimatedDuration: 24,
          expectedStorage: Math.round(floodCapacity * 0.85),
          riskAssessment: `预计72小时内蓄水量将超过防洪库容${((excess / reservoir.capacity) * 100).toFixed(1)}%，建议适度泄洪`,
          createdAt: new Date(),
        });
      }
    } else if (availableCapacity < reservoir.capacity * 0.15 && reservoir.storageRate < 40) {
      recommendations.push({
        id: `DR${Date.now()}-${reservoir.id}`,
        reservoirId: reservoir.id,
        reservoirName: reservoir.name,
        type: 'inter_basin_transfer',
        priority: 'low',
        predictedInflow,
        recommendedOutflow: 0,
        estimatedDuration: 0,
        expectedStorage: Math.round(predictedStorage),
        riskAssessment: `当前蓄水率偏低(${reservoir.storageRate.toFixed(1)}%)，预计未来来水充足，可考虑上游水库补水`,
        createdAt: new Date(),
      });
    }
  });

  return recommendations;
}

function findDownstreamReservoir(reservoir: Reservoir, allReservoirs: Reservoir[]): Reservoir | null {
  const sameBasin = allReservoirs.filter(
    (r) => r.basin === reservoir.basin && r.id !== reservoir.id && r.storageRate < 75
  );
  if (sameBasin.length === 0) return null;
  return sameBasin.sort((a, b) => a.storageRate - b.storageRate)[0];
}

export function generateWeeklyReport(
  reservoirs: Reservoir[],
  waterQualities: WaterQualityStation[]
): WeeklyReport {
  const basins: Basin[] = ['长江流域', '黄河流域', '珠江流域', '淮河流域', '海河流域', '松花江流域', '辽河流域'];

  const totalStorage = reservoirs.reduce((sum, r) => sum + r.capacity * (r.storageRate / 100), 0);
  const storageYoY = Math.random() * 20 - 10;

  const basinStats = basins.map((basin) => {
    const basinReservoirs = reservoirs.filter((r) => r.basin === basin);
    const storage = basinReservoirs.reduce((sum, r) => sum + r.capacity * (r.storageRate / 100), 0);
    const storageChange = Math.random() * 15 - 7.5;

    const quality = waterQualities
      .filter((q) => basinReservoirs.some((r) => r.id === q.reservoirId))
      .map((q) => q.qualityStatus);
    const qualityRate =
      quality.length > 0
        ? (quality.filter((s) => s === 'excellent' || s === 'good').length / quality.length) * 100
        : 85;

    return { basin, storage, storageChange, qualityRate };
  });

  const totalQuality =
    (waterQualities.filter((q) => q.qualityStatus === 'excellent' || q.qualityStatus === 'good').length /
      waterQualities.length) *
    100;

  return {
    id: `WR${Date.now()}`,
    weekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    weekEnd: new Date(),
    totalStorage,
    storageYoY,
    waterQualityRate: totalQuality,
    waterSupplyGuaranteeRate: 96.5,
    basinStats,
    dispatchStrategies: [
      '长江流域部分水库蓄水率偏高，建议加强流域内水资源统一调度',
      '黄河流域来水偏少，建议做好抗旱预案准备',
      '珠江流域即将进入汛期，建议加强雨情监测',
      '北方流域建议做好水库联合调度优化',
    ],
    emergencyMaterials: [
      { name: '冲锋舟', current: 120, recommended: 150 },
      { name: '救生衣', current: 8500, recommended: 10000 },
      { name: '编织袋', current: 45000, recommended: 60000 },
      { name: '砂石料(吨)', current: 2800, recommended: 3500 },
      { name: '排水泵', current: 320, recommended: 400 },
      { name: '发电机组', current: 85, recommended: 100 },
    ],
  };
}
