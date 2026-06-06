export type Basin = '长江流域' | '黄河流域' | '珠江流域' | '淮河流域' | '海河流域' | '松花江流域' | '辽河流域';

export type Province = string;

export type UserLevel = 'headquarters' | 'basin' | 'reservoir';

export type AlertLevel = 'normal' | 'level1' | 'level2';

export type AlertStatus = 'pending' | 'processing' | 'resolved' | 'escalated';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Reservoir {
  id: string;
  name: string;
  basin: Basin;
  province: Province;
  capacity: number;
  deadWaterLevel: number;
  floodLimitLevel: number;
  normalWaterLevel: number;
  currentWaterLevel: number;
  inflow: number;
  outflow: number;
  storageRate: number;
  lat: number;
  lng: number;
  adminId: string;
}

export interface RainfallStation {
  id: string;
  name: string;
  reservoirId: string;
  rainfall1h: number;
  rainfall24h: number;
  rainfall7d: number;
  timestamp: Date;
}

export interface WaterQualityStation {
  id: string;
  name: string;
  reservoirId: string;
  ph: number;
  dissolvedOxygen: number;
  cod: number;
  nh3n: number;
  turbidity: number;
  qualityStatus: 'excellent' | 'good' | 'qualified' | 'unqualified';
  timestamp: Date;
}

export interface PumpStation {
  id: string;
  name: string;
  reservoirId: string;
  downstreamReservoirId?: string;
  currentFlow: number;
  maxCapacity: number;
  status: 'running' | 'stopped' | 'maintenance';
  timestamp: Date;
}

export interface WaterLevelRecord {
  timestamp: Date;
  waterLevel: number;
  inflow: number;
  outflow: number;
  storageRate: number;
}

export interface WaterQualityRecord {
  timestamp: Date;
  ph: number;
  dissolvedOxygen: number;
  cod: number;
  nh3n: number;
  turbidity: number;
}

export interface Alert {
  id: string;
  reservoirId: string;
  reservoirName: string;
  level: AlertLevel;
  type: 'below_dead' | 'above_flood';
  message: string;
  status: AlertStatus;
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  escalationReason?: string;
}

export interface Approval {
  id: string;
  alertId: string;
  action: string;
  details: string;
  level1Status: ApprovalStatus;
  level1By?: string;
  level1At?: Date;
  level2Status: ApprovalStatus;
  level2By?: string;
  level2At?: Date;
  level3Status: ApprovalStatus;
  level3By?: string;
  level3At?: Date;
  currentLevel: 1 | 2 | 3;
  createdAt: Date;
}

export interface WeatherForecast {
  date: Date;
  rainfall: number;
  temperature: number;
  humidity: number;
}

export interface DispatchRecommendation {
  id: string;
  reservoirId: string;
  reservoirName: string;
  type: 'flood_release' | 'inter_basin_transfer';
  priority: 'high' | 'medium' | 'low';
  predictedInflow: number;
  recommendedOutflow: number;
  targetReservoirId?: string;
  targetReservoirName?: string;
  estimatedDuration: number;
  expectedStorage: number;
  riskAssessment: string;
  createdAt: Date;
}

export interface WeeklyReport {
  id: string;
  weekStart: Date;
  weekEnd: Date;
  totalStorage: number;
  storageYoY: number;
  waterQualityRate: number;
  waterSupplyGuaranteeRate: number;
  basinStats: {
    basin: Basin;
    storage: number;
    storageChange: number;
    qualityRate: number;
  }[];
  dispatchStrategies: string[];
  emergencyMaterials: {
    name: string;
    current: number;
    recommended: number;
  }[];
}

export interface User {
  id: string;
  name: string;
  level: UserLevel;
  basin?: Basin;
  reservoirId?: string;
  province?: Province;
}
