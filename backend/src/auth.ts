import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export const JWT_SECRET = process.env.JWT_SECRET || 'water-monitor-super-secret-key-2024';
export const JWT_EXPIRES_IN = '24h';

export interface JwtPayload {
  id: string;
  name: string;
  level: 'headquarters' | 'basin' | 'reservoir';
  basin?: string;
  reservoirId?: string;
  province?: string;
}

export function signToken(user: JwtPayload): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权：缺少Token' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: '未授权：Token无效或已过期' });
  }
}

export function requireLevel(...levels: JwtPayload['level'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as JwtPayload;
    if (!user || !levels.includes(user.level)) {
      return res.status(403).json({ error: '权限不足' });
    }
    next();
  };
}

export function canViewReservoir(user: JwtPayload, reservoirBasin: string, reservoirId: string): boolean {
  if (user.level === 'headquarters') return true;
  if (user.level === 'basin') return user.basin === reservoirBasin;
  if (user.level === 'reservoir') return user.reservoirId === reservoirId;
  return false;
}
