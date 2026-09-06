import type { NextFunction, Request, Response } from 'express';
import { getAdminClient } from './supabase';

export interface AuthedRequest extends Request {
  userId: string;
  jwt: string;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Missing authorization token.' });
    return;
  }
  const { data, error } = await getAdminClient().auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid or expired session.' });
    return;
  }
  (req as AuthedRequest).userId = data.user.id;
  (req as AuthedRequest).jwt = token;
  next();
}
