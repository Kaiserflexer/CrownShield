import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getTokenFromRequest, requireUser, verifyToken } from '../_lib/auth';
import { readJsonBody } from '../_lib/body';
import { sendJson } from '../_lib/http';
import { readDataset, writeDataset } from '../_lib/storage';
import type { LikeRecord, VideoRecord } from '../_lib/types';

const LIKES_FALLBACK: LikeRecord[] = [];
const VIDEOS_FALLBACK: VideoRecord[] = [];

const toggleSchema = z.object({
  videoId: z.string().min(1)
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const videoId = typeof req.query.videoId === 'string' ? req.query.videoId : undefined;
  const likes = await readDataset('likes', LIKES_FALLBACK);

  if (req.method === 'GET') {
    const token = getTokenFromRequest(req);
    const payload = token ? verifyToken(token) : null;
    const count = videoId
      ? likes.filter((like) => like.videoId === videoId).length
      : likes.length;
    const liked = videoId && payload
      ? likes.some((like) => like.videoId === videoId && like.userId === payload.sub)
      : false;

    sendJson(res, 200, { likes: count, liked });
    return;
  }

  if (req.method === 'POST') {
    const user = requireUser(req, res);
    if (!user) {
      return;
    }

    const body = await readJsonBody(req);
    const parsed = toggleSchema.safeParse(body);
    if (!parsed.success) {
      sendJson(res, 400, { error: parsed.error.flatten() });
      return;
    }

    const existing = likes.find(
      (entry) => entry.videoId === parsed.data.videoId && entry.userId === user.sub
    );
    let nextLikes: LikeRecord[];
    let liked: boolean;

    if (existing) {
      nextLikes = likes.filter((entry) => entry.id !== existing.id);
      liked = false;
    } else {
      const record: LikeRecord = {
        id: randomUUID(),
        userId: user.sub,
        videoId: parsed.data.videoId,
        createdAt: new Date().toISOString()
      };
      nextLikes = [...likes, record];
      liked = true;
    }

    await writeDataset('likes', nextLikes);

    const videos = await readDataset('videos', VIDEOS_FALLBACK);
    const updatedVideos = videos.map((video) =>
      video.id === parsed.data.videoId
        ? { ...video, likes: nextLikes.filter((entry) => entry.videoId === video.id).length }
        : video
    );
    await writeDataset('videos', updatedVideos);
    await writeDataset('catalog', { videos: updatedVideos });

    sendJson(res, 200, {
      likes: nextLikes.filter((entry) => entry.videoId === parsed.data.videoId).length,
      liked
    });
    return;
  }

  res.setHeader('Allow', 'GET,POST');
  sendJson(res, 405, { error: 'Method not allowed' });
}
