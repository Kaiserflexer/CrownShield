import { updateDataset } from './storage';
import type { RateLimitBucket } from './types';

const RATELIMIT_FALLBACK: RateLimitBucket[] = [];

export interface RateLimitOptions {
  key: string;
  windowMs: number;
  max: number;
}

export async function isRateLimited(
  ip: string,
  options: RateLimitOptions
): Promise<boolean> {
  let limited = false;

  await updateDataset<RateLimitBucket[]>(
    'ratelimits',
    (current) => {
      const now = Date.now();
      const windowStart = now - options.windowMs;
      const index = current.findIndex(
        (entry) => entry.ip === ip && entry.key === options.key
      );
      const bucket: RateLimitBucket =
        index >= 0 ? { ...current[index] } : { ip, key: options.key, timestamps: [] };

      bucket.timestamps = bucket.timestamps.filter((timestamp) => timestamp >= windowStart);
      if (bucket.timestamps.length >= options.max) {
        limited = true;
      } else {
        bucket.timestamps = [...bucket.timestamps, now];
        limited = false;
      }

      const next = [...current];
      if (bucket.timestamps.length === 0) {
        if (index >= 0) {
          next.splice(index, 1);
        }
      } else if (index >= 0) {
        next[index] = bucket;
      } else {
        next.push(bucket);
      }

      return next;
    },
    RATELIMIT_FALLBACK
  );

  return limited;
}
