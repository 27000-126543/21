import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type {
  Reservoir,
  RainfallStation,
  WaterQualityStation,
  PumpStation,
  Alert,
  Approval,
  User,
  WeatherForecast,
  DispatchRecommendation,
  WeeklyReport,
  WaterLevelRecord,
  WaterQualityRecord,
} from '../types';
import {
  generateReservoirs,
  generateRainfallStations,
  generateWaterQualityStations,
  generatePumpStations,
  generateWaterLevelHistory,
  generateWaterQualityHistory,
} from '../data/mockData';
import { USERS, getCurrentUser, saveCurrentUser, filterReservoirsByUser } from '../utils/permissions';
import { generateWeeklyReport, generateDispatchRecommendations } from '../utils/dispatchAndReport';

interface DataContextType {
  reservoirs: Reservoir[];
  rainfallStations: RainfallStation[];
  waterQualityStations: WaterQualityStation[];
  pumpStations: PumpStation[];
  alerts: Alert[];
  approvals: Approval[];
  currentUser: User;
  weatherForecasts: WeatherForecast[];
  dispatchRecommendations: DispatchRecommendation[];
  weeklyReport: WeeklyReport | null;
  waterLevelHistory: Record<string, WaterLevelRecord[]>;
  waterQualityHistory: Record<string, WaterQualityRecord[]>;
  filteredReservoirs: Reservoir[];
  switchUser: (user: User) => void;
  addAlert: (alert: Alert) => void;
  updateAlert: (alert: Alert) => void;
  addApproval: (approval: Approval) => void;
  updateApproval: (approval: Approval) => void;
  setWeatherForecasts: (forecasts: WeatherForecast[]) => void;
  refreshData: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [reservoirs, setReservoirs] = useState<Reservoir[]>([]);
  const [rainfallStations, setRainfallStations] = useState<RainfallStation[]>([]);
  const [waterQualityStations, setWaterQualityStations] = useState<WaterQualityStation[]>([]);
  const [pumpStations, setPumpStations] = useState<PumpStation[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [currentUser, setCurrentUser] = useState<User>(USERS[0]);
  const [weatherForecasts, setWeatherForecasts] = useState<WeatherForecast[]>([]);
  const [waterLevelHistory, setWaterLevelHistory] = useState<Record<string, WaterLevelRecord[]>>({});
  const [waterQualityHistory, setWaterQualityHistory] = useState<Record<string, WaterQualityRecord[]>>({});

  useEffect(() => {
    const saved = getCurrentUser();
    if (saved) {
      const matched = USERS.find(u => u.id === saved.id) || saved;
      setCurrentUser(matched);
    }
  }, []);

  const initializeData = useCallback(() => {
    const newReservoirs = generateReservoirs();
    setReservoirs(newReservoirs);
    setRainfallStations(generateRainfallStations(newReservoirs));
    setWaterQualityStations(generateWaterQualityStations(newReservoirs));
    setPumpStations(generatePumpStations(newReservoirs));

    const levelHistory: Record<string, WaterLevelRecord[]> = {};
    const qualityHistory: Record<string, WaterQualityRecord[]> = {};
    newReservoirs.forEach(r => {
      levelHistory[r.id] = generateWaterLevelHistory(r, 30);
      qualityHistory[r.id] = generateWaterQualityHistory(30);
    });
    setWaterLevelHistory(levelHistory);
    setWaterQualityHistory(qualityHistory);
  }, []);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setReservoirs(prev =>
        prev.map(r => ({
          ...r,
          currentWaterLevel: Math.max(
            r.deadWaterLevel - 0.5,
            Math.min(r.floodLimitLevel + 0.5, r.currentWaterLevel + (Math.random() - 0.5) * 0.3)
          ),
          inflow: Math.max(10, r.inflow + (Math.random() - 0.5) * 50),
          outflow: Math.max(5, r.outflow + (Math.random() - 0.5) * 30),
          storageRate: Math.max(10, Math.min(100, r.storageRate + (Math.random() - 0.5) * 0.5)),
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const dispatchRecommendations = weatherForecasts.length > 0
    ? generateDispatchRecommendations(reservoirs, weatherForecasts)
    : [];

  const weeklyReport = reservoirs.length > 0 && waterQualityStations.length > 0
    ? generateWeeklyReport(reservoirs, waterQualityStations)
    : null;

  const filteredReservoirs = filterReservoirsByUser(reservoirs, currentUser);

  const switchUser = (user: User) => {
    setCurrentUser(user);
    saveCurrentUser(user);
  };

  const addAlert = (alert: Alert) => {
    setAlerts(prev => [alert, ...prev]);
  };

  const updateAlert = (alert: Alert) => {
    setAlerts(prev => prev.map(a => (a.id === alert.id ? alert : a)));
  };

  const addApproval = (approval: Approval) => {
    setApprovals(prev => [approval, ...prev]);
  };

  const updateApproval = (approval: Approval) => {
    setApprovals(prev => prev.map(a => (a.id === approval.id ? approval : a)));
  };

  const refreshData = () => {
    initializeData();
  };

  return (
    <DataContext.Provider
      value={{
        reservoirs,
        rainfallStations,
        waterQualityStations,
        pumpStations,
        alerts,
        approvals,
        currentUser,
        weatherForecasts,
        dispatchRecommendations,
        weeklyReport,
        waterLevelHistory,
        waterQualityHistory,
        filteredReservoirs,
        switchUser,
        addAlert,
        updateAlert,
        addApproval,
        updateApproval,
        setWeatherForecasts,
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
