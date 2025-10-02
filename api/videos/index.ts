import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requireUser } from '../_lib/auth';
import { readJsonBody } from '../_lib/body';
import { getClientIp, sendJson } from '../_lib/http';
import { isRateLimited } from '../_lib/rate-limit';
import { readDataset, updateDataset, writeDataset } from '../_lib/storage';
import type { VideoRecord } from '../_lib/types';

const VIDEOS_FALLBACK: VideoRecord[] = [];
const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  tags: z.array(z.string()).default([]),
  videoUrl: z.string().url(),
  posterUrl: z.string().url(),
  duration: z.number().positive()
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const videos = await readDataset('videos', VIDEOS_FALLBACK);
    const { q, tag } = req.query;
    const query = typeof q === 'string' ? q.toLowerCase() : '';
    const filterTag = typeof tag === 'string' ? tag.toLowerCase() : '';

    const filtered = videos.filter((video) => {
      const matchesQuery = query
        ? video.title.toLowerCase().includes(query) ||
          video.description.toLowerCase().includes(query) ||
          video.tags.some((t) => t.toLowerCase().includes(query))
        : true;
      const matchesTag = filterTag
        ? video.tags.some((t) => t.toLowerCase() === filterTag)
        : true;
      return matchesQuery && matchesTag;
    });

    sendJson(res, 200, { videos: filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
    return;
  }

  if (req.method === 'POST') {
    const user = requireUser(req, res);
    if (!user) {
      return;
    }

    const ip = getClientIp(req);
    const limited = await isRateLimited(ip, {
      key: 'videos:create',
      windowMs: 60_000,
      max: 3
    });
    if (limited) {
      sendJson(res, 429, { error: 'Too many requests' });
      return;
    }

    const body = await readJsonBody(req);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      sendJson(res, 400, { error: parsed.error.flatten() });
      return;
    }

    const now = new Date().toISOString();
    const record: VideoRecord = {
      id: randomUUID(),
      title: parsed.data.title,
      description: parsed.data.description,
      tags: parsed.data.tags,
      videoUrl: parsed.data.videoUrl,
      posterUrl: parsed.data.posterUrl,
      duration: parsed.data.duration,
      channelId: user.sub,
      channelName: user.displayName,
      createdAt: now,
      updatedAt: now,
      views: 0,
      likes: 0
    };

    const videos = await updateDataset(
      'videos',
      (current) => [...current, record],
      VIDEOS_FALLBACK
    );

    await writeDataset('catalog', {
      videos
    });

    sendJson(res, 201, { video: record });
    return;
  }

  res.setHeader('Allow', 'GET,POST');
  sendJson(res, 405, { error: 'Method not allowed' });
}
