import bcrypt from 'bcryptjs';
import { initDatabase, insert, remove, findMany } from './db';
import {
  BASINS, RESERVOIR_NAMES, PROVINCE_BY_BASIN,
  randomInRange, pickRandom, computeStorageRate, getWaterQualityStatus,
} from './utils';

initDatabase();

function seed() {
  const password = bcrypt.hashSync('123456', 10);
  remove('users', () => true);
  const users = [
    { id: 'U001', name: '总部管理员', password, level: 'headquarters', basin: null, reservoir_id: null, province: null },
    { id: 'U002', name: '长江流域调度员', password, level: 'basin', basin: '长江流域', reservoir_id: null, province: null },
    { id: 'U003', name: '黄河流域调度员', password, level: 'basin', basin: '黄河流域', reservoir_id: null, province: null },
    { id: 'U004', name: '珠江流域调度员', password, level: 'basin', basin: '珠江流域', reservoir_id: null, province: null },
    { id: 'U005', name: '三峡水库管理员', password, level: 'reservoir', basin: '长江流域', reservoir_id: 'R0001', province: null },
    { id: 'U006', name: '小浪底水库管理员', password, level: 'reservoir', basin: '黄河流域', reservoir_id: 'R0009', province: null },
  ];
  users.forEach(u => insert('users', u));
  console.log('✅ 已创建 6 个用户 (密码均为 123456)');

  ['pump_stations', 'water_quality_history', 'water_level_history', 'water_quality_stations', 'rainfall_stations', 'reservoirs', 'alerts', 'approvals', 'weather_forecasts', 'weekly_reports', 'dispatch_recommendations'].forEach(t => remove(t as any, () => true));

  let id = 1;
  const allReservoirs = [] as any[];

  BASINS.forEach(basin => {
    const names = RESERVOIR_NAMES[basin];
    const provinces = PROVINCE_BY_BASIN[basin];
    names.forEach(name => {
      const capacity = randomInRange(10, 500, 0) * 10000000;
      const deadWaterLevel = randomInRange(80, 150, 1);
      const floodLimitLevel = randomInRange(deadWaterLevel + 40, deadWaterLevel + 80, 1);
      const normalWaterLevel = randomInRange(deadWaterLevel + 20, floodLimitLevel - 5, 1);
      let currentWaterLevel = randomInRange(deadWaterLevel - 1, floodLimitLevel + 1, 1);
      if (id % 7 === 0) currentWaterLevel = floodLimitLevel + randomInRange(0.3, 1.5, 1);
      if (id % 11 === 0) currentWaterLevel = deadWaterLevel - randomInRange(0.2, 0.8, 1);
      const inflow = randomInRange(50, 2000, 0);
      const outflow = randomInRange(50, 1500, 0);
      const storageRate = computeStorageRate(currentWaterLevel, deadWaterLevel, normalWaterLevel);
      const baseLat = basin.includes('松花') || basin.includes('辽河') ? 42
        : basin.includes('黄河') || basin.includes('海河') ? 37
        : basin.includes('长江') ? 31 : 25;
      const baseLng = basin.includes('长江') || basin.includes('黄河') ? 110
        : basin.includes('珠江') ? 110
        : basin.includes('淮河') ? 117
        : basin.includes('海河') ? 117
        : basin.includes('松花') ? 127 : 123;
      const rid = `R${id.toString().padStart(4, '0')}`;
      insert('reservoirs', {
        id: rid, name, basin, province: pickRandom(provinces), capacity,
        dead_water_level: deadWaterLevel, flood_limit_level: floodLimitLevel,
        normal_water_level: normalWaterLevel, current_water_level: currentWaterLevel,
        inflow, outflow, storage_rate: storageRate,
        lat: baseLat + randomInRange(-3, 3, 2), lng: baseLng + randomInRange(-5, 5, 2),
        admin_id: `A${id.toString().padStart(4, '0')}`, updated_at: new Date().toISOString(),
      });
      allReservoirs.push({ rid, name, basin, deadWaterLevel, floodLimitLevel, normalWaterLevel, currentWaterLevel, inflow, outflow, storageRate });

      insert('rainfall_stations', {
        id: `RS${id.toString().padStart(4, '0')}`, name: `${name}雨量站`, reservoir_id: rid,
        rainfall_1h: randomInRange(0, 80, 1), rainfall_24h: randomInRange(0, 200, 1),
        rainfall_7d: randomInRange(0, 500, 1), timestamp: new Date().toISOString(),
      });

      const ph = randomInRange(6.5, 8.5, 2);
      const do2 = randomInRange(5, 12, 2);
      const cod = randomInRange(5, 30, 1);
      const nh3n = randomInRange(0.05, 2, 3);
      const turbidity = randomInRange(1, 50, 1);
      insert('water_quality_stations', {
        id: `WS${id.toString().padStart(4, '0')}`, name: `${name}水质站`, reservoir_id: rid,
        ph, dissolved_oxygen: do2, cod, nh3n, turbidity,
        quality_status: getWaterQualityStatus(ph, do2, cod, nh3n), timestamp: new Date().toISOString(),
      });
      id++;
    });
  });

  allReservoirs.forEach((r, idx) => {
    if (Math.random() > 0.3) {
      const downstream = allReservoirs[(idx + 3) % allReservoirs.length];
      insert('pump_stations', {
        id: `PS${idx.toString().padStart(4, '0')}`, name: `${r.name}下游泵站`, reservoir_id: r.rid,
        downstream_reservoir_id: downstream.rid, current_flow: randomInRange(0, 500, 0),
        max_capacity: randomInRange(300, 1000, 0),
        status: pickRandom(['running', 'stopped', 'maintenance'] as const),
        timestamp: new Date().toISOString(),
      });
    }
  });

  const now = new Date();
  allReservoirs.forEach(r => {
    let level = r.normalWaterLevel;
    for (let d = 30; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      const delta = randomInRange(-1.5, 1.5, 2);
      level = Math.max(r.deadWaterLevel - 1, Math.min(r.floodLimitLevel + 1, level + delta));
      const inflow = randomInRange(50, 2000, 0);
      const outflow = randomInRange(50, 1500, 0);
      insert('water_level_history', {
        reservoir_id: r.rid, timestamp: date.toISOString(), water_level: level,
        inflow, outflow, storage_rate: computeStorageRate(level, r.deadWaterLevel, r.normalWaterLevel),
      });
      insert('water_quality_history', {
        reservoir_id: r.rid, timestamp: date.toISOString(),
        ph: randomInRange(6.5, 8.5, 2), dissolved_oxygen: randomInRange(5, 12, 2),
        cod: randomInRange(5, 30, 1), nh3n: randomInRange(0.05, 2, 3),
        turbidity: randomInRange(1, 50, 1),
      });
    }
  });

  console.log(`✅ 已创建 ${allReservoirs.length} 座水库及关联数据`);
  console.log('✅ 已生成 30 天水位/水质历史数据');
  console.log('\n🎉 种子数据生成完毕！现在可以启动后端服务了。');
  console.log('   默认登录账号: 总部管理员 / 123456\n');
}

seed();
