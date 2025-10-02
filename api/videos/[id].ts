import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { requireUser } from '../_lib/auth';
import { readJsonBody } from '../_lib/body';
import { sendJson } from '../_lib/http';
import { readDataset, writeDataset } from '../_lib/storage';
import type { VideoRecord } from '../_lib/types';

const VIDEOS_FALLBACK: VideoRecord[] = [];

const updateSchema = z
  .object({
    title: z.string().min(3).optional(),
    description: z.string().min(3).optional(),
    tags: z.array(z.string()).optional(),
    posterUrl: z.string().url().optional()
  })
  .strict();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) {
    sendJson(res, 400, { error: 'Missing id' });
    return;
  }

  const videos = await readDataset('videos', VIDEOS_FALLBACK);
  const video = videos.find((entry) => entry.id === id);
  if (!video) {
    sendJson(res, 404, { error: 'Video not found' });
    return;
  }

  if (req.method === 'GET') {
    sendJson(res, 200, { video });
    return;
  }

  if (req.method === 'PUT') {
    const user = requireUser(req, res);
    if (!user) {
      return;
    }
    if (video.channelId !== user.sub) {
      sendJson(res, 403, { error: 'Forbidden' });
      return;
    }

    const body = await readJsonBody(req);
    const parsed = updateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      sendJson(res, 400, { error: parsed.error.flatten() });
      return;
    }

    const updated: VideoRecord = {
      ...video,
      ...parsed.data,
      updatedAt: new Date().toISOString()
    };

    const nextVideos = videos.map((entry) => (entry.id === id ? updated : entry));
    await writeDataset('videos', nextVideos);
    await writeDataset('catalog', { videos: nextVideos });

    sendJson(res, 200, { video: updated });
    return;
  }

  if (req.method === 'DELETE') {
    const user = requireUser(req, res);
    if (!user) {
      return;
    }
    if (video.channelId !== user.sub) {
      sendJson(res, 403, { error: 'Forbidden' });
      return;
    }

    const remaining = videos.filter((entry) => entry.id !== id);
    await writeDataset('videos', remaining);
    await writeDataset('catalog', { videos: remaining });
    sendJson(res, 200, { success: true });
    return;
  }

  res.setHeader('Allow', 'GET,PUT,DELETE');
  sendJson(res, 405, { error: 'Method not allowed' });
}
