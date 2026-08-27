import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import jwt from 'jsonwebtoken';

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_dev_only_change_in_prod";
    const request = getRequest();

    if (!request?.headers) {
      throw new Error('Unauthorized: No request headers available');
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized: No authorization header provided');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      throw new Error('Unauthorized: No token provided');
    }

    let userId: string | null = null;
    let email: string | null = null;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { sub?: string; id?: string; email?: string };
      userId = decoded.sub || decoded.id || null;
      email = decoded.email || null;
    } catch (err) {
      throw new Error('Unauthorized: Invalid or expired token');
    }

    if (!userId) {
      throw new Error('Unauthorized: Invalid token payload');
    }

    return next({
      context: {
        supabase: null,
        userId,
        claims: { sub: userId, email },
      },
    });
  },
);
