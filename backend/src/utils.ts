export type Basin = '长江流域' | '黄河流域' | '珠江流域' | '淮河流域' | '海河流域' | '松花江流域' | '辽河流域';

export const BASINS: Basin[] = ['长江流域', '黄河流域', '珠江流域', '淮河流域', '海河流域', '松花江流域', '辽河流域'];

export const RESERVOIR_NAMES: Record<Basin, string[]> = {
  '长江流域': ['三峡水库', '葛洲坝水库', '丹江口水库', '二滩水库', '溪洛渡水库', '向家坝水库', '乌江渡水库', '隔河岩水库'],
  '黄河流域': ['小浪底水库', '三门峡水库', '刘家峡水库', '龙羊峡水库', '万家寨水库', '青铜峡水库'],
  '珠江流域': ['新丰江水库', '飞来峡水库', '天生桥水库', '龙滩水库', '百色水库'],
  '淮河流域': ['佛子岭水库', '梅山水库', '响洪甸水库', '磨子潭水库', '宿鸭湖水库'],
  '海河流域': ['密云水库', '潘家口水库', '官厅水库', '岗南水库', '王快水库'],
  '松花江流域': ['丰满水库', '白山水库', '尼尔基水库', '莲花水库'],
  '辽河流域': ['大伙房水库', '观音阁水库', '白石水库', '清河水库'],
};

export const PROVINCE_BY_BASIN: Record<Basin, string[]> = {
  '长江流域': ['湖北', '四川', '重庆', '湖南', '江西', '安徽', '江苏', '上海'],
  '黄河流域': ['河南', '陕西', '山西', '甘肃', '青海', '宁夏', '内蒙古', '山东'],
  '珠江流域': ['广东', '广西', '贵州', '云南'],
  '淮河流域': ['河南', '安徽', '江苏', '山东'],
  '海河流域': ['北京', '天津', '河北', '山西'],
  '松花江流域': ['吉林', '黑龙江', '内蒙古'],
  '辽河流域': ['辽宁', '内蒙古'],
};

export function randomInRange(min: number, max: number, decimals = 2): number {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function computeStorageRate(currentLevel: number, deadLevel: number, normalLevel: number): number {
  const usable = normalLevel - deadLevel;
  const current = currentLevel - deadLevel;
  return Math.max(0, Math.min(100, (current / usable) * 100));
}

export function computeBalanceIndex(inflow: number, outflow: number): number {
  if (outflow === 0) return inflow > 0 ? 100 : 0;
  return Math.round((inflow / outflow) * 100) / 100;
}

export function getWaterQualityStatus(
  ph: number,
  dissolvedOxygen: number,
  cod: number,
  nh3n: number
): 'excellent' | 'good' | 'qualified' | 'unqualified' {
  if (ph >= 6.5 && ph <= 8.5 && dissolvedOxygen >= 7.5 && cod <= 15 && nh3n <= 0.5) return 'excellent';
  if (ph >= 6 && ph <= 9 && dissolvedOxygen >= 6 && cod <= 20 && nh3n <= 1) return 'good';
  if (ph >= 6 && ph <= 9 && dissolvedOxygen >= 5 && cod <= 30 && nh3n <= 1.5) return 'qualified';
  return 'unqualified';
}
