import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { findFirst, insert } from '../db';
import { authMiddleware, signToken } from '../auth';

const router = Router();

router.post('/login', (req: Request, res: Response) => {
  const { name, password } = req.body as { name: string; password: string };
  if (!name || !password) return res.status(400).json({ error: '用户名和密码不能为空' });

  const user = findFirst('users', (u: any) => u.name === name);
  if (!user) return res.status(401).json({ error: '用户名或密码错误' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: '用户名或密码错误' });

  const payload = {
    id: user.id, name: user.name, level: user.level,
    basin: user.basin || undefined, reservoirId: user.reservoir_id || undefined,
    province: user.province || undefined,
  };
  const token = signToken(payload);
  res.json({ token, user: payload });
});

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  res.json({ user: (req as any).user });
});

export default router;
