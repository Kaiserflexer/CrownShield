import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { requireUser } from './_lib/auth';
import { readJsonBody } from './_lib/body';
import { sendJson } from './_lib/http';
import { readDataset, writeDataset } from './_lib/storage';
import type { UserRecord } from './_lib/types';

const USERS_FALLBACK: UserRecord[] = [];

const schema = z.object({
  displayName: z.string().min(2).max(50),
  bio: z.string().max(280).optional(),
  avatarUrl: z.string().url().optional()
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const user = requireUser(req, res);
  if (!user) {
    return;
  }

  const body = await readJsonBody(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    sendJson(res, 400, { error: parsed.error.flatten() });
    return;
  }

  const users = await readDataset('users', USERS_FALLBACK);
  const nextUsers = users.map((entry) =>
    entry.id === user.sub
      ? { ...entry, displayName: parsed.data.displayName, bio: parsed.data.bio, avatarUrl: parsed.data.avatarUrl }
      : entry
  );
  await writeDataset('users', nextUsers);

  sendJson(res, 200, {
    user: nextUsers.find((entry) => entry.id === user.sub)
  });
}
