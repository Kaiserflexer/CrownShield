import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { readJsonBody } from './_lib/body';
import { getClientIp, sendJson } from './_lib/http';
import { readDataset, updateDataset, writeDataset } from './_lib/storage';
import type { VideoRecord, ViewRecord } from './_lib/types';

const VIEWS_FALLBACK: ViewRecord[] = [];
const VIDEOS_FALLBACK: VideoRecord[] = [];

const schema = z.object({
  videoId: z.string().min(1)
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const body = await readJsonBody(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    sendJson(res, 400, { error: parsed.error.flatten() });
    return;
  }

  const ip = getClientIp(req);
  const now = Date.now();
  const windowMs = 1000 * 60 * 60 * 6; // 6 hours

  const viewRecord: ViewRecord = {
    id: randomUUID(),
    videoId: parsed.data.videoId,
    ip,
    createdAt: new Date(now).toISOString()
  };

  const views = await updateDataset(
    'views',
    (current) => {
      const filtered = current.filter((entry) => {
        if (entry.videoId !== parsed.data.videoId) {
          return true;
        }
        const timestamp = Date.parse(entry.createdAt);
        return !(entry.ip === ip && now - timestamp < windowMs);
      });
      return [...filtered, viewRecord];
    },
    VIEWS_FALLBACK
  );

  const videos = await readDataset('videos', VIDEOS_FALLBACK);
  const updatedVideos = videos.map((video) =>
    video.id === parsed.data.videoId
      ? {
          ...video,
          views: views.filter((entry) => entry.videoId === parsed.data.videoId).length
        }
      : video
  );
  await writeDataset('videos', updatedVideos);
  await writeDataset('catalog', { videos: updatedVideos });

  sendJson(res, 200, { success: true });
}
