import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';

const DB_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DB_DIR, 'db.json');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

interface DbShape {
  users: any[];
  reservoirs: any[];
  rainfall_stations: any[];
  water_quality_stations: any[];
  pump_stations: any[];
  water_level_history: any[];
  water_quality_history: any[];
  alerts: any[];
  approvals: any[];
  weather_forecasts: any[];
  weekly_reports: any[];
  dispatch_recommendations: any[];
}

const DEFAULT_DB: DbShape = {
  users: [], reservoirs: [], rainfall_stations: [], water_quality_stations: [],
  pump_stations: [], water_level_history: [], water_quality_history: [],
  alerts: [], approvals: [], weather_forecasts: [], weekly_reports: [],
  dispatch_recommendations: [],
};

let cache: DbShape | null = null;
let saveTimer: any = null;

function load(): DbShape {
  if (cache) return cache;
  if (!fs.existsSync(DB_FILE)) {
    cache = JSON.parse(JSON.stringify(DEFAULT_DB));
    return cache;
  }
  try {
    cache = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch {
    cache = JSON.parse(JSON.stringify(DEFAULT_DB));
  }
  return cache;
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    if (cache) fs.writeFileSync(DB_FILE, JSON.stringify(cache, null, 2));
    saveTimer = null;
  }, 50);
}

export function getTable<T extends keyof DbShape>(name: T): DbShape[T] {
  return load()[name];
}

export function insert<T extends keyof DbShape>(name: T, row: any): any {
  const db = load();
  const arr = db[name] as any[];
  if (!row.id) row.id = nanoid(8);
  if (!row.created_at) row.created_at = new Date().toISOString();
  if (!row.timestamp) row.timestamp = new Date().toISOString();
  arr.push(row);
  scheduleSave();
  return row;
}

export function update<T extends keyof DbShape>(name: T, predicate: (r: any) => boolean, patch: any): number {
  const db = load();
  const arr = db[name] as any[];
  let count = 0;
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i])) {
      arr[i] = { ...arr[i], ...patch };
      count++;
    }
  }
  if (count) scheduleSave();
  return count;
}

export function findFirst<T extends keyof DbShape>(name: T, predicate: (r: any) => boolean): any {
  return (load()[name] as any[]).find(predicate);
}

export function findMany<T extends keyof DbShape>(name: T, predicate?: (r: any) => boolean): any[] {
  const arr = load()[name] as any[];
  return predicate ? arr.filter(predicate) : arr.slice();
}

export function remove<T extends keyof DbShape>(name: T, predicate: (r: any) => boolean): number {
  const db = load();
  const arr = db[name] as any[];
  const before = arr.length;
  db[name] = arr.filter(r => !predicate(r)) as any;
  if (arr.length !== before) scheduleSave();
  return before - (db[name] as any[]).length;
}

export function nowISO() {
  return new Date().toISOString();
}

export function initDatabase() {
  load();
  console.log('✅ JSON Database loaded at', DB_FILE);
}
