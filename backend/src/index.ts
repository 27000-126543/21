import express from 'express';
import cors from 'cors';
import { initDatabase } from './db';
import authRoutes from './routes/auth';
import dataRoutes from './routes/data';
import alertsRoutes from './routes/alerts';
import dispatchRoutes from './routes/dispatch';
import reportsRoutes from './routes/reports';

const app = express();
const PORT = process.env.PORT || 4000;

initDatabase();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'water-monitor-backend', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api', alertsRoutes);
app.use('/api', dispatchRoutes);
app.use('/api', reportsRoutes);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 水资源监测后端服务已启动: http://localhost:${PORT}`);
  console.log(`📊 API 基路径: http://localhost:${PORT}/api`);
  console.log(`💡 运行 npm run seed 初始化种子数据\n`);
});
