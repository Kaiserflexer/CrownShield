import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { randomUUID } from 'node:crypto';
import { sendJson } from './http';
import { readDataset, updateDataset } from './storage';
import type { AuthTokenPayload, UserRecord } from './types';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';
const COOKIE_NAME = 'crownshield_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

const USERS_FALLBACK: UserRecord[] = [];

export async function listUsers(): Promise<UserRecord[]> {
  return readDataset<UserRecord[]>('users', USERS_FALLBACK);
}

export async function createUser(
  email: string,
  password: string,
  displayName: string
): Promise<UserRecord> {
  const now = new Date().toISOString();
  const hash = await bcrypt.hash(password, 12);

  const user: UserRecord = {
    id: randomUUID(),
    email: email.toLowerCase(),
    passwordHash: hash,
    displayName,
    createdAt: now
  };

  await updateDataset<UserRecord[]>(
    'users',
    async (current) => {
      if (current.some((existing) => existing.email === user.email)) {
        throw new Error('User already exists');
      }
      return [...current, user];
    },
    USERS_FALLBACK
  );

  return user;
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<UserRecord | null> {
  const users = await listUsers();
  const user = users.find((entry) => entry.email === email.toLowerCase());
  if (!user) {
    return null;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}

export function signToken(user: UserRecord): string {
  const payload: AuthTokenPayload = {
    sub: user.id,
    email: user.email,
    displayName: user.displayName
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function setAuthCookie(res: VercelResponse, token: string): void {
  const cookie = serialize(COOKIE_NAME, token, {
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE
  });
  res.setHeader('Set-Cookie', cookie);
}

export function clearAuthCookie(res: VercelResponse): void {
  const cookie = serialize(COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(0)
  });
  res.setHeader('Set-Cookie', cookie);
}

export function getTokenFromRequest(req: VercelRequest): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return null;
  }
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((pair) => {
      const [key, ...rest] = pair.trim().split('=');
      return [key, decodeURIComponent(rest.join('='))];
    })
  );
  return cookies[COOKIE_NAME] ?? null;
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch (error: unknown) {
    return null;
  }
}

export function requireUser(
  req: VercelRequest,
  res: VercelResponse
): AuthTokenPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return null;
  }
  const payload = verifyToken(token);
  if (!payload) {
    sendJson(res, 401, { error: 'Invalid token' });
    return null;
  }
  return payload;
}
