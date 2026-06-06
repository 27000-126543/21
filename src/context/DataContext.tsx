import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, setToken, clearToken } from '../services/api';
import type {
  Reservoir, RainfallStation, WaterQualityStation, PumpStation,
  Alert, Approval, User, WeatherForecast, DispatchRecommendation,
  WeeklyReport, WaterLevelRecord, WaterQualityRecord,
} from '../types';
import { filterReservoirsByUser } from '../utils/permissions';

interface DataContextType {
  loading: boolean;
  error: string | null;
  user: User | null;
  token: string | null;
  reservoirs: Reservoir[];
  rainfallStations: RainfallStation[];
  waterQualityStations: WaterQualityStation[];
  pumpStations: PumpStation[];
  alerts: Alert[];
  approvals: Approval[];
  weatherForecasts: WeatherForecast[];
  dispatchRecommendations: DispatchRecommendation[];
  weeklyReport: WeeklyReport | null;
  waterLevelHistory: Record<string, WaterLevelRecord[]>;
  waterQualityHistory: Record<string, WaterQualityRecord[]>;
  filteredReservoirs: Reservoir[];
  login: (name: string, password: string) => Promise<void>;
  logout: () => void;
  switchUser: (user: User) => void;
  loadAll: () => Promise<void>;
  addAlert: (alert: Alert) => void;
  updateAlert: (alert: Alert) => void;
  addApproval: (approval: Approval) => void;
  updateApproval: (approval: Approval) => void;
  setWeatherForecasts: (forecasts: WeatherForecast[]) => void;
  loadWaterLevelHistory: (id: string) => Promise<void>;
  loadWaterQualityHistory: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [reservoirs, setReservoirs] = useState<Reservoir[]>([]);
  const [rainfallStations, setRainfallStations] = useState<RainfallStation[]>([]);
  const [waterQualityStations, setWaterQualityStations] = useState<WaterQualityStation[]>([]);
  const [pumpStations, setPumpStations] = useState<PumpStation[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [weatherForecasts, setWeatherForecastsState] = useState<WeatherForecast[]>([]);
  const [waterLevelHistory, setWaterLevelHistory] = useState<Record<string, WaterLevelRecord[]>>({});
  const [waterQualityHistory, setWaterQualityHistory] = useState<Record<string, WaterQualityRecord[]>>({});

  const login = useCallback(async (name: string, password: string) => {
    const res = await api.auth.login({ name, password });
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user as User);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const switchUser = useCallback((u: User) => {
    setUser(u);
  }, []);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [r, rs, wq, ps, al, ap, wf, dr, wr] = await Promise.all([
        api.reservoirs.list(),
        api.rainfall(),
        api.waterQuality(),
        api.pumpStations(),
        api.alerts.list(),
        api.approvals.list(),
        api.weather.forecasts().catch(() => []),
        api.weather.recommendations().catch(() => []),
        api.reports.weekly().catch(() => null),
      ]);
      setReservoirs(r || []);
      setRainfallStations(rs || []);
      setWaterQualityStations(wq || []);
      setPumpStations(ps || []);
      setAlerts(al || []);
      setApprovals(ap || []);
      setWeatherForecastsState(wf || []);
      setDispatchRecommendationsState(dr || []);
      setWeeklyReportState(wr);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const [dispatchRecommendations, setDispatchRecommendationsState] = useState<DispatchRecommendation[]>([]);
  const [weeklyReport, setWeeklyReportState] = useState<WeeklyReport | null>(null);

  const loadWaterLevelHistory = useCallback(async (id: string) => {
    try {
      const data = await api.reservoirs.waterLevelHistory(id, 30);
      setWaterLevelHistory(prev => ({ ...prev, [id]: data }));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadWaterQualityHistory = useCallback(async (id: string) => {
    try {
      const data = await api.reservoirs.waterQualityHistory(id, 30);
      setWaterQualityHistory(prev => ({ ...prev, [id]: data }));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const addAlert = useCallback((alert: Alert) => {
    setAlerts(prev => [alert, ...prev]);
    api.alerts.create(alert).catch(() => {});
  }, []);

  const updateAlert = useCallback((alert: Alert) => {
    setAlerts(prev => prev.map(a => a.id === alert.id ? alert : a));
    api.alerts.update(alert.id, { status: alert.status }).catch(() => {});
  }, []);

  const addApproval = useCallback((approval: Approval) => {
    setApprovals(prev => [approval, ...prev]);
    api.approvals.create({ alertId: approval.alertId, action: approval.action, details: approval.details }).catch(() => {});
  }, []);

  const updateApproval = useCallback((approval: Approval) => {
    setApprovals(prev => prev.map(a => a.id === approval.id ? approval : a));
  }, []);

  const setWeatherForecasts = useCallback((f: WeatherForecast[]) => {
    setWeatherForecastsState(f);
  }, []);

  const refreshData = useCallback(async () => {
    await loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (user) loadAll();
  }, [user, loadAll]);

  useEffect(() => {
    if (!user) return;
    const t = setInterval(async () => {
      try {
        const data = await api.reservoirs.list();
        setReservoirs(data || []);
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [user]);

  const filteredReservoirs = user ? filterReservoirsByUser(reservoirs, user) : [];

  return (
    <DataContext.Provider
      value={{
        loading, error, user, token,
        reservoirs, rainfallStations, waterQualityStations, pumpStations,
        alerts, approvals, weatherForecasts, dispatchRecommendations, weeklyReport,
        waterLevelHistory, waterQualityHistory, filteredReservoirs,
        login, logout, switchUser, loadAll,
        addAlert, updateAlert, addApproval, updateApproval,
        setWeatherForecasts,
        loadWaterLevelHistory, loadWaterQualityHistory,
        refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
