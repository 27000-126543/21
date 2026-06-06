import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Shield,
  ChevronRight,
  Bell,
  Play,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import {
  getAlertLevelColor,
  getAlertLevelText,
  getAlertStatusColor,
  getAlertStatusText,
  checkWaterLevelAlert,
  escalateAlert,
  createApproval,
  approveLevel,
  isApprovalComplete,
  shouldEscalateAlert,
} from '../utils/alertSystem';
import { canApproveLevel } from '../utils/permissions';
import type { Alert, Approval } from '../types';

export default function AlertCenter() {
  const {
    filteredReservoirs,
    alerts,
    approvals,
    currentUser,
    waterLevelHistory,
    addAlert,
    updateAlert,
    addApproval,
    updateApproval,
  } = useData();

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);

  useEffect(() => {
    filteredReservoirs.forEach(reservoir => {
      const history = (waterLevelHistory[reservoir.id] || []).slice(-6).map(r => ({
        level: r.waterLevel,
        time: r.timestamp,
      }));
      if (history.length > 0) {
        const now = new Date();
        for (let i = 0; i < 6; i++) {
          history.push({
            level: reservoir.currentWaterLevel,
            time: new Date(now.getTime() - i * 10 * 60 * 1000),
          });
        }
      }
      const alert = checkWaterLevelAlert(reservoir, history);
      if (alert && !alerts.some(a => a.reservoirId === reservoir.id && a.status !== 'resolved')) {
        addAlert(alert);
      }
    });

    const interval = setInterval(() => {
      alerts.forEach(alert => {
        if (shouldEscalateAlert(alert)) {
          updateAlert(escalateAlert(alert));
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [filteredReservoirs, waterLevelHistory, alerts, addAlert, updateAlert]);

  const pendingAlerts = alerts.filter(a => a.status === 'pending' || a.status === 'escalated');
  const processingAlerts = alerts.filter(a => a.status === 'processing');
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved');

  const handleAcknowledge = (alert: Alert) => {
    updateAlert({ ...alert, status: 'processing', acknowledgedAt: new Date() });
  };

  const handleResolve = (alert: Alert) => {
    updateAlert({ ...alert, status: 'resolved', resolvedAt: new Date() });
    setSelectedAlert(null);
  };

  const handleCreateApproval = (alert: Alert) => {
    const approval = createApproval(
      alert,
      alert.type === 'above_flood' ? '启动泄洪预案' : '紧急补水调度',
      `${alert.reservoirName}${alert.type === 'above_flood' ? '水位超汛限，申请增加出库流量' : '水位低于死水位，申请上游补水'}`
    );
    addApproval(approval);
    setSelectedApproval(approval);
  };

  const handleApprove = (approval: Approval, level: 1 | 2 | 3, approve: boolean) => {
    if (!canApproveLevel(currentUser, level)) return;
    const updated = approveLevel(approval, level, currentUser, approve);
    updateApproval(updated);
    setSelectedApproval(updated);

    if (isApprovalComplete(updated)) {
      const alert = alerts.find(a => a.id === updated.alertId);
      if (alert) {
        updateAlert({ ...alert, status: 'resolved', resolvedAt: new Date() });
      }
    }
  };

  const getApprovalStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-slate-500/20 text-slate-400',
      approved: 'bg-green-500/20 text-green-400',
      rejected: 'bg-red-500/20 text-red-400',
    };
    return map[status] || map.pending;
  };

  const getApprovalStatusText = (status: string) => {
    const map: Record<string, string> = {
      pending: '待审批',
      approved: '已通过',
      rejected: '已驳回',
    };
    return map[status] || '待审批';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card bg-gradient-to-br from-red-500/20 to-red-600/5 border-red-500/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-sm text-slate-400">待处理预警</span>
          </div>
          <div className="text-3xl font-bold text-white">{pendingAlerts.length}</div>
          <div className="text-xs text-slate-400 mt-1">需立即关注处置</div>
        </div>
        <div className="stat-card bg-gradient-to-br from-blue-500/20 to-blue-600/5 border-blue-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Play className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-slate-400">处理中</span>
          </div>
          <div className="text-3xl font-bold text-white">{processingAlerts.length}</div>
          <div className="text-xs text-slate-400 mt-1">正在执行处置流程</div>
        </div>
        <div className="stat-card bg-gradient-to-br from-green-500/20 to-green-600/5 border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-sm text-slate-400">已解决</span>
          </div>
          <div className="text-3xl font-bold text-white">{resolvedAlerts.length}</div>
          <div className="text-xs text-slate-400 mt-1">本周累计处理</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-water-400" /> 预警列表
            </h3>
          </div>

          {alerts.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无预警信息</p>
              <p className="text-sm mt-1">系统运行正常</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  onClick={() => {
                    setSelectedAlert(alert);
                    const approval = approvals.find(a => a.alertId === alert.id);
                    setSelectedApproval(approval || null);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:bg-slate-700/50 ${
                    selectedAlert?.id === alert.id
                      ? 'bg-slate-700/50 border-water-500/50'
                      : 'bg-slate-700/30 border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${getAlertLevelColor(alert.level)}`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-medium">{alert.reservoirName}</span>
                          <span className={`badge ${getAlertLevelColor(alert.level)}`}>
                            {getAlertLevelText(alert.level)}
                          </span>
                          <span className={`badge border ${getAlertStatusColor(alert.status)}`}>
                            {getAlertStatusText(alert.status)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 mt-1.5">{alert.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(alert.createdAt).toLocaleString('zh-CN')}
                          </span>
                          {alert.escalationReason && (
                            <span className="text-red-400">{alert.escalationReason}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-base font-semibold text-white mb-4">预警详情与审批</h3>

          {!selectedAlert ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              请从左侧选择一个预警查看详情
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`badge ${getAlertLevelColor(selectedAlert.level)}`}>
                    {getAlertLevelText(selectedAlert.level)}
                  </span>
                  <span className={`badge border ${getAlertStatusColor(selectedAlert.status)}`}>
                    {getAlertStatusText(selectedAlert.status)}
                  </span>
                </div>
                <h4 className="text-white font-medium">{selectedAlert.reservoirName}</h4>
                <p className="text-sm text-slate-300 mt-2">{selectedAlert.message}</p>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">预警类型</span>
                  <span className="text-white">
                    {selectedAlert.type === 'above_flood' ? '超汛限水位' : '低于死水位'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">触发时间</span>
                  <span className="text-white">
                    {new Date(selectedAlert.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                {selectedAlert.acknowledgedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">确认时间</span>
                    <span className="text-white">
                      {new Date(selectedAlert.acknowledgedAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {selectedAlert.status === 'pending' && (
                  <button
                    onClick={() => handleAcknowledge(selectedAlert)}
                    className="flex-1 btn-primary text-sm"
                  >
                    确认预警
                  </button>
                )}
                {selectedAlert.status === 'processing' && selectedAlert.level === 'level2' && (
                  <button
                    onClick={() => handleCreateApproval(selectedAlert)}
                    disabled={!!approvals.find(a => a.alertId === selectedAlert.id)}
                    className="flex-1 btn-primary text-sm disabled:opacity-50"
                  >
                    发起调度审批
                  </button>
                )}
                {selectedAlert.status !== 'resolved' && (
                  <button
                    onClick={() => handleResolve(selectedAlert)}
                    className="btn-secondary text-sm"
                  >
                    标记解决
                  </button>
                )}
              </div>

              {selectedApproval && (
                <div className="border-t border-slate-700 pt-4 mt-4">
                  <h5 className="text-sm font-semibold text-white mb-3">三层审批流程</h5>
                  <div className="space-y-3">
                    {[
                      { level: 1 as const, label: '水库管理员确认', status: selectedApproval.level1Status, by: selectedApproval.level1By, at: selectedApproval.level1At },
                      { level: 2 as const, label: '流域调度中心复核', status: selectedApproval.level2Status, by: selectedApproval.level2By, at: selectedApproval.level2At },
                      { level: 3 as const, label: '省级防汛指挥部批准', status: selectedApproval.level3Status, by: selectedApproval.level3By, at: selectedApproval.level3At },
                    ].map(item => (
                      <div
                        key={item.level}
                        className={`p-3 rounded-lg border ${
                          selectedApproval.currentLevel === item.level
                            ? 'bg-water-600/10 border-water-500/30'
                            : 'bg-slate-700/30 border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              item.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                              item.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                              selectedApproval.currentLevel === item.level ? 'bg-water-500/20 text-water-400' :
                              'bg-slate-600 text-slate-400'
                            }`}>
                              {item.status === 'approved' ? <CheckCircle className="w-3 h-3" /> :
                               item.status === 'rejected' ? <XCircle className="w-3 h-3" /> :
                               item.level}
                            </div>
                            <span className="text-sm text-white">{item.label}</span>
                          </div>
                          <span className={`badge ${getApprovalStatusBadge(item.status)}`}>
                            {getApprovalStatusText(item.status)}
                          </span>
                        </div>
                        {item.by && (
                          <div className="mt-2 pl-8 text-xs text-slate-400 flex items-center gap-1">
                            <User className="w-3 h-3" /> {item.by}
                            {item.at && ` · ${new Date(item.at).toLocaleString('zh-CN')}`}
                          </div>
                        )}
                        {selectedApproval.currentLevel === item.level &&
                          item.status === 'pending' &&
                          canApproveLevel(currentUser, item.level) && (
                          <div className="mt-3 pl-8 flex gap-2">
                            <button
                              onClick={() => handleApprove(selectedApproval, item.level, true)}
                              className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-xs text-white font-medium transition-colors"
                            >
                              批准
                            </button>
                            <button
                              onClick={() => handleApprove(selectedApproval, item.level, false)}
                              className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-xs text-white font-medium transition-colors"
                            >
                              驳回
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
                    <div className="text-xs text-slate-400 mb-1">申请内容</div>
                    <div className="text-sm text-white font-medium">{selectedApproval.action}</div>
                    <div className="text-sm text-slate-300 mt-1">{selectedApproval.details}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
