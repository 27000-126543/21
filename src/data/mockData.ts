import type { Basin, Reservoir, RainfallStation, WaterQualityStation, PumpStation, WaterLevelRecord, WaterQualityRecord } from '../types';

const BASINS: Basin[] = ['长江流域', '黄河流域', '珠江流域', '淮河流域', '海河流域', '松花江流域', '辽河流域'];

const RESERVOIR_NAMES: Record<Basin, string[]> = {
  '长江流域': ['三峡水库', '葛洲坝水库', '丹江口水库', '二滩水库', '溪洛渡水库', '向家坝水库', '乌江渡水库', '隔河岩水库'],
  '黄河流域': ['小浪底水库', '三门峡水库', '刘家峡水库', '龙羊峡水库', '万家寨水库', '青铜峡水库'],
  '珠江流域': ['新丰江水库', '飞来峡水库', '天生桥水库', '龙滩水库', '百色水库'],
  '淮河流域': ['佛子岭水库', '梅山水库', '响洪甸水库', '磨子潭水库', '宿鸭湖水库'],
  '海河流域': ['密云水库', '潘家口水库', '官厅水库', '岗南水库', '王快水库'],
  '松花江流域': ['丰满水库', '白山水库', '尼尔基水库', '莲花水库'],
  '辽河流域': ['大伙房水库', '观音阁水库', '白石水库', '清河水库'],
};

const PROVINCE_BY_BASIN: Record<Basin, string[]> = {
  '长江流域': ['湖北', '四川', '重庆', '湖南', '江西', '安徽', '江苏', '上海'],
  '黄河流域': ['河南', '陕西', '山西', '甘肃', '青海', '宁夏', '内蒙古', '山东'],
  '珠江流域': ['广东', '广西', '贵州', '云南'],
  '淮河流域': ['河南', '安徽', '江苏', '山东'],
  '海河流域': ['北京', '天津', '河北', '山西'],
  '松花江流域': ['吉林', '黑龙江', '内蒙古'],
  '辽河流域': ['辽宁', '内蒙古'],
};

function randomInRange(min: number, max: number, decimals = 2): number {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateReservoirs(): Reservoir[] {
  const reservoirs: Reservoir[] = [];
  let id = 1;

  BASINS.forEach((basin) => {
    const names = RESERVOIR_NAMES[basin];
    const provinces = PROVINCE_BY_BASIN[basin];

    names.forEach((name) => {
      const capacity = randomInRange(10, 500, 0);
      const deadWaterLevel = randomInRange(80, 150, 1);
      const floodLimitLevel = randomInRange(deadWaterLevel + 40, deadWaterLevel + 80, 1);
      const normalWaterLevel = randomInRange(deadWaterLevel + 20, floodLimitLevel - 5, 1);
      const currentWaterLevel = randomInRange(deadWaterLevel - 2, floodLimitLevel + 2, 1);
      const inflow = randomInRange(50, 2000, 0);
      const outflow = randomInRange(50, 1500, 0);

      const baseLat = basin.includes('松花') || basin.includes('辽河') ? 42 : basin.includes('黄河') || basin.includes('海河') ? 37 : basin.includes('长江') ? 31 : 25;
      const baseLng = basin.includes('长江') || basin.includes('黄河') ? 110 : basin.includes('珠江') ? 110 : basin.includes('淮河') ? 117 : basin.includes('海河') ? 117 : basin.includes('松花') ? 127 : 123;

      reservoirs.push({
        id: `R${id.toString().padStart(4, '0')}`,
        name,
        basin,
        province: pickRandom(provinces),
        capacity: capacity * 10000000,
        deadWaterLevel,
        floodLimitLevel,
        normalWaterLevel,
        currentWaterLevel,
        inflow,
        outflow,
        storageRate: randomInRange(30, 98, 1),
        lat: baseLat + randomInRange(-3, 3, 2),
        lng: baseLng + randomInRange(-5, 5, 2),
        adminId: `A${id.toString().padStart(4, '0')}`,
      });
      id++;
    });
  });

  return reservoirs;
}

export function generateRainfallStations(reservoirs: Reservoir[]): RainfallStation[] {
  return reservoirs.map((r, idx) => ({
    id: `RS${idx.toString().padStart(4, '0')}`,
    name: `${r.name}雨量站`,
    reservoirId: r.id,
    rainfall1h: randomInRange(0, 80, 1),
    rainfall24h: randomInRange(0, 200, 1),
    rainfall7d: randomInRange(0, 500, 1),
    timestamp: new Date(),
  }));
}

export function generateWaterQualityStations(reservoirs: Reservoir[]): WaterQualityStation[] {
  return reservoirs.map((r, idx) => {
    const ph = randomInRange(6.5, 8.5, 2);
    const dissolvedOxygen = randomInRange(5, 12, 2);
    const cod = randomInRange(5, 30, 1);
    const nh3n = randomInRange(0.05, 2, 3);
    const turbidity = randomInRange(1, 50, 1);

    let qualityStatus: WaterQualityStation['qualityStatus'] = 'good';
    if (ph >= 6.5 && ph <= 8.5 && dissolvedOxygen >= 7.5 && cod <= 15 && nh3n <= 0.5) {
      qualityStatus = 'excellent';
    } else if (ph >= 6 && ph <= 9 && dissolvedOxygen >= 6 && cod <= 20 && nh3n <= 1) {
      qualityStatus = 'good';
    } else if (ph >= 6 && ph <= 9 && dissolvedOxygen >= 5 && cod <= 30 && nh3n <= 1.5) {
      qualityStatus = 'qualified';
    } else {
      qualityStatus = 'unqualified';
    }

    return {
      id: `WS${idx.toString().padStart(4, '0')}`,
      name: `${r.name}水质站`,
      reservoirId: r.id,
      ph,
      dissolvedOxygen,
      cod,
      nh3n,
      turbidity,
      qualityStatus,
      timestamp: new Date(),
    };
  });
}

export function generatePumpStations(reservoirs: Reservoir[]): PumpStation[] {
  const stations: PumpStation[] = [];
  reservoirs.forEach((r, idx) => {
    if (Math.random() > 0.3) {
      const downstreamIdx = (idx + Math.floor(Math.random() * 3) + 1) % reservoirs.length;
      stations.push({
        id: `PS${idx.toString().padStart(4, '0')}`,
        name: `${r.name}下游泵站`,
        reservoirId: r.id,
        downstreamReservoirId: reservoirs[downstreamIdx].id,
        currentFlow: randomInRange(0, 500, 0),
        maxCapacity: randomInRange(300, 1000, 0),
        status: pickRandom(['running', 'stopped', 'maintenance'] as const),
        timestamp: new Date(),
      });
    }
  });
  return stations;
}

export function generateWaterLevelHistory(reservoir: Reservoir, days = 30): WaterLevelRecord[] {
  const records: WaterLevelRecord[] = [];
  const now = new Date();
  let level = reservoir.normalWaterLevel;

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const delta = randomInRange(-1.5, 1.5, 2);
    level = Math.max(reservoir.deadWaterLevel - 1, Math.min(reservoir.floodLimitLevel + 1, level + delta));

    const inflow = randomInRange(50, 2000, 0);
    const outflow = randomInRange(50, 1500, 0);

    records.push({
      timestamp: date,
      waterLevel: level,
      inflow,
      outflow,
      storageRate: randomInRange(30, 98, 1),
    });
  }

  return records;
}

export function generateWaterQualityHistory(days = 30): WaterQualityRecord[] {
  const records: WaterQualityRecord[] = [];
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    records.push({
      timestamp: date,
      ph: randomInRange(6.5, 8.5, 2),
      dissolvedOxygen: randomInRange(5, 12, 2),
      cod: randomInRange(5, 30, 1),
      nh3n: randomInRange(0.05, 2, 3),
      turbidity: randomInRange(1, 50, 1),
    });
  }

  return records;
}
