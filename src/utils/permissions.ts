import type { User, Reservoir, UserLevel, Basin } from '../types';

export const CURRENT_USER_KEY = 'water_platform_current_user';

export const USERS: User[] = [
  { id: 'U001', name: '总部管理员', level: 'headquarters' },
  { id: 'U002', name: '长江流域调度员', level: 'basin', basin: '长江流域' },
  { id: 'U003', name: '黄河流域调度员', level: 'basin', basin: '黄河流域' },
  { id: 'U004', name: '珠江流域调度员', level: 'basin', basin: '珠江流域' },
  { id: 'U005', name: '三峡水库管理员', level: 'reservoir', basin: '长江流域', reservoirId: 'R0001' },
  { id: 'U006', name: '小浪底水库管理员', level: 'reservoir', basin: '黄河流域', reservoirId: 'R0009' },
];

export function getUserLevelText(level: UserLevel): string {
  const map: Record<UserLevel, string> = {
    headquarters: '总部',
    basin: '流域',
    reservoir: '水库',
  };
  return map[level];
}

export function filterReservoirsByUser(reservoirs: Reservoir[], user: User): Reservoir[] {
  switch (user.level) {
    case 'headquarters':
      return reservoirs;
    case 'basin':
        return reservoirs.filter(r => r.basin === user.basin);
    case 'reservoir':
      return reservoirs.filter(r => r.id === user.reservoirId);
    default:
      return [];
  }
}

export function filterBasinsByUser(basins: Basin[], user: User): Basin[] {
  switch (user.level) {
    case 'headquarters':
      return basins;
    case 'basin':
      return user.basin ? [user.basin] : [];
    case 'reservoir':
      return user.basin ? [user.basin] : [];
    default:
      return [];
  }
}

export function canViewReservoir(user: User, reservoirId: string, reservoirBasin: Basin): boolean {
  switch (user.level) {
    case 'headquarters':
      return true;
    case 'basin':
      return user.basin === reservoirBasin;
    case 'reservoir':
      return user.reservoirId === reservoirId;
    default:
      return false;
  }
}

export function canApproveLevel(user: User, level: 1 | 2 | 3): boolean {
  if (level === 1) return user.level === 'reservoir' || user.level === 'basin' || user.level === 'headquarters';
  if (level === 2) return user.level === 'basin' || user.level === 'headquarters';
  if (level === 3) return user.level === 'headquarters';
  return false;
}

export function saveCurrentUser(user: User): void {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export function getCurrentUser(): User | null {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
}
