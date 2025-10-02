import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requireUser } from '../_lib/auth';
import { readJsonBody } from '../_lib/body';
import { getClientIp, sendJson } from '../_lib/http';
import { isRateLimited } from '../_lib/rate-limit';
import { readDataset, updateDataset } from '../_lib/storage';
import type { CommentRecord } from '../_lib/types';

const COMMENTS_FALLBACK: CommentRecord[] = [];

const createSchema = z.object({
  videoId: z.string().min(1),
  content: z.string().min(1).max(500)
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const videoId = typeof req.query.videoId === 'string' ? req.query.videoId : null;
    if (!videoId) {
      sendJson(res, 400, { error: 'Missing videoId' });
      return;
    }
    const comments = await readDataset('comments', COMMENTS_FALLBACK);
    sendJson(res, 200, {
      comments: comments
        .filter((comment) => comment.videoId === videoId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    });
    return;
  }

  if (req.method === 'POST') {
    const user = requireUser(req, res);
    if (!user) {
      return;
    }

    const ip = getClientIp(req);
    const limited = await isRateLimited(ip, {
      key: 'comment',
      windowMs: 60_000,
      max: 20
    });
    if (limited) {
      sendJson(res, 429, { error: 'Slow down' });
      return;
    }

    const body = await readJsonBody(req);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      sendJson(res, 400, { error: parsed.error.flatten() });
      return;
    }

    const now = new Date().toISOString();
    const comment: CommentRecord = {
      id: randomUUID(),
      videoId: parsed.data.videoId,
      content: parsed.data.content,
      createdAt: now,
      updatedAt: now,
      authorId: user.sub,
      authorName: user.displayName
    };

    await updateDataset(
      'comments',
      (current) => [...current, comment],
      COMMENTS_FALLBACK
    );

    sendJson(res, 201, { comment });
    return;
  }

  res.setHeader('Allow', 'GET,POST');
  sendJson(res, 405, { error: 'Method not allowed' });
}
