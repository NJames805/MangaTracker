import { Request, Response, NextFunction } from 'express';
import { supabase } from './supabase';

export interface AuthedRequest extends Request {
    userId?: string;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;

    if (!token) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing bearer token', status: 401 } });
        return;
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token', status: 401 } });
        return;
    }

    req.userId = data.user.id;
    next();
}
