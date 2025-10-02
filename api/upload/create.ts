import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { requireUser } from '../_lib/auth';
import { readJsonBody } from '../_lib/body';
import { getClientIp, sendJson } from '../_lib/http';
import { isRateLimited } from '../_lib/rate-limit';

const schema = z.object({
  filename: z.string().min(3),
  contentType: z.string().min(3),
  resource: z.enum(['video', 'poster'])
});

const limitMb = Number(process.env.FILE_SIZE_LIMIT_MB ?? '250');
const maximumSizeInBytes = Math.round(limitMb * 1024 * 1024);
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const user = requireUser(req, res);
  if (!user) {
    return;
  }

  const ip = getClientIp(req);
  const limited = await isRateLimited(ip, {
    key: 'upload',
    windowMs: 60_000,
    max: 5
  });

  if (limited) {
    sendJson(res, 429, { error: 'Too many uploads' });
    return;
  }

  const body = await readJsonBody(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    sendJson(res, 400, { error: parsed.error.flatten() });
    return;
  }

  const uniqueId = randomUUID();
  const safeName = parsed.data.filename.replace(/[^a-zA-Z0-9_.-]/g, '-');
  const pathname =
    parsed.data.resource === 'video'
      ? `videos/${user.sub}/${uniqueId}-${safeName}`
      : `posters/${user.sub}/${uniqueId}.png`;

  const token = jwt.sign(
    {
      pathname,
      contentType: parsed.data.contentType,
      resource: parsed.data.resource,
      sub: user.sub,
      limit: maximumSizeInBytes
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const baseUrl = process.env.BLOB_PUBLIC_BASE_URL ?? null;
  const publicUrl = baseUrl
    ? (baseUrl.endsWith('/') ? `${baseUrl}${pathname}` : `${baseUrl}/${pathname}`)
    : null;

  sendJson(res, 200, {
    uploadUrl: '/api/upload/direct',
    uploadToken: token,
    blobPath: pathname,
    publicUrl,
    maximumSizeInBytes
  });
}
