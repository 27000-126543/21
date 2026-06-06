import type { Alert, AlertLevel, AlertStatus, Approval, ApprovalStatus, Reservoir, User } from '../types';

let alertIdCounter = 1;
let approvalIdCounter = 1;

export function checkWaterLevelAlert(reservoir: Reservoir, historyLevels: { level: number; time: Date }[]): Alert | null {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentLevels = historyLevels.filter(h => h.time >= oneHourAgo);

  if (recentLevels.length === 0) return null;

  const allBelowDead = recentLevels.every(h => h.level < reservoir.deadWaterLevel);
  const allAboveFlood = recentLevels.every(h => h.level > reservoir.floodLimitLevel);

  if (!allBelowDead && !allAboveFlood) return null;

  const type = allBelowDead ? 'below_dead' : 'above_flood';
  const level: AlertLevel = 'level1';
  const message = allBelowDead
    ? `${reservoir.name}水位已连续1小时低于死水位(${reservoir.deadWaterLevel}m)，当前水位${reservoir.currentWaterLevel.toFixed(1)}m`
    : `${reservoir.name}水位已连续1小时超过汛限水位(${reservoir.floodLimitLevel}m)，当前水位${reservoir.currentWaterLevel.toFixed(1)}m`;

  return {
    id: `AL${alertIdCounter++}`,
    reservoirId: reservoir.id,
    reservoirName: reservoir.name,
    level,
    type,
    message,
    status: 'pending',
    createdAt: new Date(),
  };
}

export function shouldEscalateAlert(alert: Alert): boolean {
  if (alert.level !== 'level1') return false;
  if (alert.status === 'resolved') return false;

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  return alert.createdAt <= twoHoursAgo && alert.status !== 'processing';
}

export function escalateAlert(alert: Alert): Alert {
  return {
    ...alert,
    level: 'level2',
    status: 'escalated',
    escalationReason: '2小时内未处置，已升级为二级预警',
  };
}

export function createApproval(alert: Alert, action: string, details: string): Approval {
  return {
    id: `AP${approvalIdCounter++}`,
    alertId: alert.id,
    action,
    details,
    level1Status: 'pending',
    level2Status: 'pending',
    level3Status: 'pending',
    currentLevel: 1,
    createdAt: new Date(),
  };
}

export function approveLevel(
  approval: Approval,
  level: 1 | 2 | 3,
  user: User,
  approve: boolean
): Approval {
  const updated: Approval = { ...approval };
  const status: ApprovalStatus = approve ? 'approved' : 'rejected';
  const now = new Date();

  if (level === 1) {
    updated.level1Status = status;
    updated.level1By = user.name;
    updated.level1At = now;
    if (approve) updated.currentLevel = 2;
  } else if (level === 2) {
    updated.level2Status = status;
    updated.level2By = user.name;
    updated.level2At = now;
    if (approve) updated.currentLevel = 3;
  } else if (level === 3) {
    updated.level3Status = status;
    updated.level3By = user.name;
    updated.level3At = now;
  }

  return updated;
}

export function isApprovalComplete(approval: Approval): boolean {
  return approval.level1Status === 'approved' &&
    approval.level2Status === 'approved' &&
    approval.level3Status === 'approved';
}

export function getAlertStatusColor(status: AlertStatus): string {
  const map: Record<AlertStatus, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
    escalated: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return map[status];
}

export function getAlertLevelColor(level: AlertLevel): string {
  const map: Record<AlertLevel, string> = {
    normal: 'bg-slate-500/20 text-slate-400',
    level1: 'bg-orange-500/20 text-orange-400',
    level2: 'bg-red-500/20 text-red-400',
  };
  return map[level];
}

export function getAlertLevelText(level: AlertLevel): string {
  const map: Record<AlertLevel, string> = {
    normal: '正常',
    level1: '一级预警',
    level2: '二级预警',
  };
  return map[level];
}

export function getAlertStatusText(status: AlertStatus): string {
  const map: Record<AlertStatus, string> = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    escalated: '已升级',
  };
  return map[status];
}
