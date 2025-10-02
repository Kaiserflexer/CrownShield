import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import {
  authenticateUser,
  clearAuthCookie,
  createUser,
  requireUser,
  setAuthCookie,
  signToken,
  verifyToken
} from './_lib/auth';
import { readJsonBody } from './_lib/body';
import { getClientIp, sendJson } from './_lib/http';
import { isRateLimited } from './_lib/rate-limit';

const authSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('login'),
    email: z.string().email(),
    password: z.string().min(6)
  }),
  z.object({
    type: z.literal('register'),
    email: z.string().email(),
    password: z.string().min(6),
    displayName: z.string().min(2).max(50)
  })
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const token = req.headers.cookie ? requireUser(req, res) : verifyFromHeader(req, res);
    if (!token) {
      return;
    }
    sendJson(res, 200, {
      user: { id: token.sub, email: token.email, displayName: token.displayName }
    });
    return;
  }

  if (req.method === 'DELETE') {
    clearAuthCookie(res);
    sendJson(res, 200, { success: true });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET,POST,DELETE');
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);
  const limited = await isRateLimited(ip, {
    key: 'auth',
    windowMs: 60_000,
    max: 10
  });

  if (limited) {
    sendJson(res, 429, { error: 'Too many requests' });
    return;
  }

  const body = await readJsonBody(req);
  if (!body) {
    sendJson(res, 400, { error: 'Missing payload' });
    return;
  }

  const parsed = authSchema.safeParse(body);
  if (!parsed.success) {
    sendJson(res, 400, { error: parsed.error.flatten() });
    return;
  }

  if (parsed.data.type === 'register') {
    try {
      const user = await createUser(parsed.data.email, parsed.data.password, parsed.data.displayName);
      const token = signToken(user);
      setAuthCookie(res, token);
      sendJson(res, 201, {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName
        }
      });
    } catch (error: unknown) {
      sendJson(res, 400, { error: (error as Error).message });
    }
    return;
  }

  if (parsed.data.type === 'login') {
    const user = await authenticateUser(parsed.data.email, parsed.data.password);
    if (!user) {
      sendJson(res, 401, { error: 'Invalid credentials' });
      return;
    }
    const token = signToken(user);
    setAuthCookie(res, token);
    sendJson(res, 200, {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName
      }
    });
    return;
  }
}

function verifyFromHeader(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return null;
  }
  const token = authHeader.replace('Bearer ', '');
  const payload = verifyToken(token);
  if (!payload) {
    sendJson(res, 401, { error: 'Invalid token' });
    return null;
  }
  return payload;
}
