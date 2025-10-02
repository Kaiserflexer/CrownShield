import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../_lib/auth';
import { sendJson } from '../_lib/http';
import { readDataset, writeDataset } from '../_lib/storage';
import type { CommentRecord } from '../_lib/types';

const COMMENTS_FALLBACK: CommentRecord[] = [];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) {
    sendJson(res, 400, { error: 'Missing id' });
    return;
  }

  const user = requireUser(req, res);
  if (!user) {
    return;
  }

  const comments = await readDataset('comments', COMMENTS_FALLBACK);
  const comment = comments.find((entry) => entry.id === id);
  if (!comment) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  if (comment.authorId !== user.sub) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  const remaining = comments.filter((entry) => entry.id !== id);
  await writeDataset('comments', remaining);

  sendJson(res, 200, { success: true });
}
