import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { findMany, insert, nowISO } from '../db';
import { authMiddleware, canViewReservoir } from '../auth';
import { Basin } from '../utils';

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

const RUNOFF_COEFFICIENTS: Record<Basin, number> = {
  '长江流域': 0.65, '黄河流域': 0.45, '珠江流域': 0.7,
  '淮河流域': 0.55, '海河流域': 0.4, '松花江流域': 0.5, '辽河流域': 0.48,
};

function parseForecastExcel(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  if (!jsonData || jsonData.length < 2) return [];
  const headers = jsonData[0].map((h: any) => String(h).toLowerCase().trim());
  const dateIdx = headers.findIndex((h: string) => h.includes('日期') || h.includes('date'));
  const rainIdx = headers.findIndex((h: string) => h.includes('降雨') || h.includes('rain'));
  const tempIdx = headers.findIndex((h: string) => h.includes('温度') || h.includes('temp'));
  const humIdx = headers.findIndex((h: string) => h.includes('湿度') || h.includes('humidity'));
  const forecasts = [] as any[];
  for (let i = 1; i < Math.min(jsonData.length, 8); i++) {
    const row = jsonData[i];
    if (!row) continue;
    const dateVal = row[dateIdx >= 0 ? dateIdx : 0];
    forecasts.push({
      date: dateVal instanceof Date ? dateVal.toISOString() : new Date(String(dateVal)).toISOString(),
      rainfall: parseFloat(row[rainIdx >= 0 ? rainIdx : 1]) || 0,
      temperature: parseFloat(row[tempIdx >= 0 ? tempIdx : 2]) || 25,
      humidity: parseFloat(row[humIdx >= 0 ? humIdx : 3]) || 70,
    });
  }
  return forecasts;
}

router.post('/weather/upload', authMiddleware, upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: '请上传Excel文件' });
  try {
    const forecasts = parseForecastExcel(req.file.buffer);
    if (forecasts.length === 0) return res.status(400).json({ error: '无法解析Excel' });
    forecasts.forEach(f => insert('weather_forecasts', {
      reservoir_id: null, forecast_date: f.date, rainfall: f.rainfall,
      temperature: f.temperature, humidity: f.humidity, uploaded_at: nowISO(),
    }));
    res.json(forecasts);
  } catch (e: any) {
    res.status(500).json({ error: e.message || '解析失败' });
  }
});

router.get('/weather/forecasts', authMiddleware, (_req: Request, res: Response) => {
  const rows = findMany('weather_forecasts')
    .sort((a, b) => a.forecast_date.localeCompare(b.forecast_date))
    .slice(0, 10);
  res.json(rows.map((r: any) => ({
    date: r.forecast_date, rainfall: r.rainfall, temperature: r.temperature, humidity: r.humidity,
  })));
});

router.get('/dispatch/recommendations', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const reservoirs = findMany('reservoirs');
  const forecasts = findMany('weather_forecasts')
    .sort((a, b) => a.forecast_date.localeCompare(b.forecast_date))
    .slice(0, 10);
  const filtered = reservoirs.filter((r: any) => canViewReservoir(user, r.basin, r.id));
  const avgRainfall = forecasts.length > 0
    ? forecasts.reduce((s: number, f: any) => s + f.rainfall, 0) / forecasts.length
    : 0;
  const results = [] as any[];
  filtered.forEach((r: any) => {
    const coefficient = RUNOFF_COEFFICIENTS[r.basin as Basin] || 0.5;
    const catchmentArea = r.capacity / 50;
    const predictedInflow = Math.round(r.inflow * (1 + avgRainfall * coefficient * catchmentArea * 0.001));
    const floodCapacity = r.capacity * 0.9;
    const currentStorage = r.capacity * (r.storage_rate / 100);
    const predictedStorage = currentStorage + predictedInflow * 72 * 3600;
    const excess = predictedStorage - floodCapacity;
    if (predictedStorage > floodCapacity && excess / r.capacity > 0.05) {
      const priority = excess / r.capacity > 0.1 ? 'high' : 'medium';
      const sameBasin = filtered.filter((x: any) => x.basin === r.basin && x.id !== r.id && x.storage_rate < 75);
      const downstream = sameBasin.length > 0
        ? sameBasin.sort((a: any, b: any) => a.storage_rate - b.storage_rate)[0] : null;
      const canTransfer = downstream && (downstream.capacity * 0.85 - downstream.capacity * (downstream.storage_rate / 100)) > excess * 0.5;
      results.push({
        id: `DR-${r.id}-${Date.now()}`, reservoirId: r.id, reservoirName: r.name,
        type: canTransfer ? 'inter_basin_transfer' : 'flood_release', priority, predictedInflow,
        recommendedOutflow: Math.round(excess / (72 * 3600) + r.outflow * (priority === 'high' ? 1.5 : 1.2)),
        targetReservoirId: canTransfer ? downstream.id : undefined,
        targetReservoirName: canTransfer ? downstream.name : undefined,
        estimatedDuration: priority === 'high' ? 36 : 24,
        expectedStorage: Math.round(floodCapacity * 0.85),
        riskAssessment: `预计72小时蓄水量将超过防洪库容${((excess / r.capacity) * 100).toFixed(1)}%，${canTransfer ? `建议向${downstream.name}跨流域调水` : '建议启动泄洪预案'}`,
        createdAt: nowISO(),
      });
    }
  });
  res.json(results);
});

export default router;
