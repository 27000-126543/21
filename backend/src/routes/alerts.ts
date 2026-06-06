import { Router, Request, Response } from 'express';
import { findFirst, findMany, insert, update, nowISO } from '../db';
import { authMiddleware, canViewReservoir } from '../auth';

const router = Router();

router.get('/alerts', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { status } = req.query;
  const reservoirs = findMany('reservoirs');
  const basinMap = new Map(reservoirs.map((r: any) => [r.id, r.basin]));
  let rows = findMany('alerts').sort((a, b) => b.created_at.localeCompare(a.created_at));
  rows = rows.filter((a: any) => canViewReservoir(user, basinMap.get(a.reservoir_id) || '', a.reservoir_id));
  if (status) rows = rows.filter((a: any) => a.status === status);
  res.json(rows.map((r: any) => ({
    id: r.id, reservoirId: r.reservoir_id, reservoirName: r.reservoir_name,
    level: r.level, type: r.type, message: r.message, status: r.status,
    createdAt: r.created_at, acknowledgedAt: r.acknowledged_at,
    resolvedAt: r.resolved_at, escalationReason: r.escalation_reason,
  })));
});

router.post('/alerts', authMiddleware, (req: Request, res: Response) => {
  const { reservoirId, reservoirName, level, type, message } = req.body;
  const row = insert('alerts', {
    id: `AL${Date.now()}`, reservoir_id: reservoirId, reservoir_name: reservoirName,
    level, type, message, status: 'pending', created_at: nowISO(),
  });
  res.json({
    id: row.id, reservoirId, reservoirName, level, type, message,
    status: 'pending', createdAt: row.created_at,
  });
});

router.put('/alerts/:id', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const patch: any = {};
  if (status) {
    patch.status = status;
    if (status === 'processing') patch.acknowledged_at = nowISO();
    if (status === 'resolved') patch.resolved_at = nowISO();
  }
  update('alerts', (a: any) => a.id === id, patch);
  res.json(findFirst('alerts', (a: any) => a.id === id));
});

router.post('/alerts/:id/escalate', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const reason = req.body.reason || '2小时内未处置，升级为二级预警';
  update('alerts', (a: any) => a.id === id, {
    level: 'level2', status: 'escalated', escalation_reason: reason,
  });
  res.json(findFirst('alerts', (a: any) => a.id === id));
});

router.get('/approvals', authMiddleware, (_req: Request, res: Response) => {
  res.json(findMany('approvals')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((r: any) => ({
      id: r.id, alertId: r.alert_id, action: r.action, details: r.details,
      level1Status: r.level1_status, level1By: r.level1_by, level1At: r.level1_at,
      level2Status: r.level2_status, level2By: r.level2_by, level2At: r.level2_at,
      level3Status: r.level3_status, level3By: r.level3_by, level3At: r.level3_at,
      currentLevel: r.current_level, createdAt: r.created_at,
    })));
});

router.post('/approvals', authMiddleware, (req: Request, res: Response) => {
  const { alertId, action, details } = req.body;
  const row = insert('approvals', {
    id: `AP${Date.now()}`, alert_id: alertId, action, details,
    level1_status: 'pending', level2_status: 'pending', level3_status: 'pending',
    current_level: 1, created_at: nowISO(),
  });
  res.json({
    id: row.id, alertId, action, details,
    level1Status: 'pending', level2Status: 'pending', level3Status: 'pending',
    currentLevel: 1, createdAt: row.created_at,
  });
});

router.post('/approvals/:id/approve', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const { level, approved } = req.body as { level: 1 | 2 | 3; approved: boolean };
  const user = (req as any).user;
  const status = approved ? 'approved' : 'rejected';
  const approval = findFirst('approvals', (a: any) => a.id === id);
  if (!approval) return res.status(404).json({ error: '审批不存在' });

  const patch: any = {};
  if (level === 1) {
    if (user.level !== 'reservoir' && user.level !== 'basin' && user.level !== 'headquarters') {
      return res.status(403).json({ error: '权限不足' });
    }
    patch.level1_status = status; patch.level1_by = user.name; patch.level1_at = nowISO();
    patch.current_level = approved ? 2 : 1;
  } else if (level === 2) {
    if (user.level !== 'basin' && user.level !== 'headquarters') {
      return res.status(403).json({ error: '权限不足' });
    }
    patch.level2_status = status; patch.level2_by = user.name; patch.level2_at = nowISO();
    patch.current_level = approved ? 3 : 2;
  } else if (level === 3) {
    if (user.level !== 'headquarters') return res.status(403).json({ error: '权限不足' });
    patch.level3_status = status; patch.level3_by = user.name; patch.level3_at = nowISO();
    if (approved) update('alerts', (a: any) => a.id === approval.alert_id, { status: 'resolved', resolved_at: nowISO() });
  }
  update('approvals', (a: any) => a.id === id, patch);
  res.json(findFirst('approvals', (a: any) => a.id === id));
});

export default router;
