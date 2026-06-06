import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000/api';

const TOKEN_KEY = 'water_platform_token';

export interface LoginRequest {
  name: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    level: 'headquarters' | 'basin' | 'reservoir';
    basin?: string;
    reservoirId?: string;
    province?: string;
  };
}

const instance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

instance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        // 可以在此触发登录弹窗或跳转
      }
    }
    return Promise.reject(error);
  }
);

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export const api = {
  auth: {
    login: (data: LoginRequest) => instance.post<LoginResponse>('/auth/login', data).then(r => r.data),
    me: () => instance.get('/auth/me').then(r => r.data),
  },
  reservoirs: {
    list: (params?: { basin?: string }) => instance.get('/data/reservoirs', { params }).then(r => r.data),
    get: (id: string) => instance.get(`/data/reservoirs/${id}`).then(r => r.data),
    updateRealtime: (id: string, data: { waterLevel: number; inflow: number; outflow: number }) =>
      instance.post(`/data/reservoirs/${id}/realtime`, data).then(r => r.data),
    waterLevelHistory: (id: string, days = 30) =>
      instance.get(`/data/reservoirs/${id}/water-level-history`, { params: { days } }).then(r => r.data),
    waterQualityHistory: (id: string, days = 30) =>
      instance.get(`/data/reservoirs/${id}/water-quality-history`, { params: { days } }).then(r => r.data),
  },
  rainfall: () => instance.get('/data/rainfall-stations').then(r => r.data),
  waterQuality: () => instance.get('/data/water-quality-stations').then(r => r.data),
  pumpStations: () => instance.get('/data/pump-stations').then(r => r.data),
  metrics: {
    aggregate: (groupBy: 'basin' | 'province' = 'basin') =>
      instance.get('/data/metrics/aggregate', { params: { groupBy } }).then(r => r.data),
  },
  alerts: {
    list: (params?: { status?: string }) => instance.get('/alerts', { params }).then(r => r.data),
    create: (data: any) => instance.post('/alerts', data).then(r => r.data),
    update: (id: string, data: any) => instance.put(`/alerts/${id}`, data).then(r => r.data),
    escalate: (id: string, reason?: string) => instance.post(`/alerts/${id}/escalate`, { reason }).then(r => r.data),
  },
  approvals: {
    list: () => instance.get('/approvals').then(r => r.data),
    create: (data: any) => instance.post('/approvals', data).then(r => r.data),
    approve: (id: string, level: 1 | 2 | 3, approved: boolean) =>
      instance.post(`/approvals/${id}/approve`, { level, approved }).then(r => r.data),
  },
  weather: {
    upload: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return instance.post('/weather/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data);
    },
    forecasts: () => instance.get('/weather/forecasts').then(r => r.data),
    recommendations: () => instance.get('/dispatch/recommendations').then(r => r.data),
  },
  reports: {
    weekly: () => instance.get('/reports/weekly').then(r => r.data),
    generateWeekly: () => instance.post('/reports/weekly/generate').then(r => r.data),
  },
};

export default instance;
