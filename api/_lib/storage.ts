import { put } from '@vercel/blob';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

type DatasetKey =
  | 'users'
  | 'videos'
  | 'comments'
  | 'likes'
  | 'views'
  | 'catalog'
  | 'ratelimits';

const DATASET_PATHS: Record<DatasetKey, string> = {
  users: 'data/users.json',
  videos: 'data/videos.json',
  comments: 'data/comments.json',
  likes: 'data/likes.json',
  views: 'data/views.json',
  catalog: 'catalog/index.json',
  ratelimits: 'data/ratelimits.json'
};

const token = process.env.BLOB_READ_WRITE_TOKEN;
const baseUrl = process.env.BLOB_PUBLIC_BASE_URL;

async function readFromBlob(path: string): Promise<string | null> {
  if (!baseUrl) {
    return null;
  }

  const url = baseUrl.endsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Failed to read ${path}: ${res.status} ${res.statusText}`);
  }

  return await res.text();
}

async function writeToBlob(path: string, contents: string): Promise<void> {
  if (!token) {
    return;
  }

  await put(path, contents, {
    access: 'public',
    token,
    contentType: 'application/json; charset=utf-8'
  });
}

async function readFromFs(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error: unknown) {
    return null;
  }
}

async function writeToFs(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, 'utf8');
}

export async function readDataset<T>(key: DatasetKey, fallback: T): Promise<T> {
  const path = DATASET_PATHS[key];
  const localPath = join(process.cwd(), path);

  const blobValue = await readFromBlob(path);
  if (blobValue) {
    return JSON.parse(blobValue) as T;
  }

  const fsValue = await readFromFs(localPath);
  if (fsValue) {
    return JSON.parse(fsValue) as T;
  }

  await writeToFs(localPath, JSON.stringify(fallback, null, 2));
  if (token) {
    await writeToBlob(path, JSON.stringify(fallback));
  }
  return fallback;
}

export async function writeDataset<T>(key: DatasetKey, data: T): Promise<void> {
  const path = DATASET_PATHS[key];
  const localPath = join(process.cwd(), path);
  const serialized = JSON.stringify(data, null, 2);
  await writeToFs(localPath, serialized);
  await writeToBlob(path, JSON.stringify(data));
}

export async function updateDataset<T>(
  key: DatasetKey,
  updater: (current: T) => Promise<T> | T,
  fallback: T
): Promise<T> {
  const current = await readDataset<T>(key, fallback);
  const next = await updater(current);
  await writeDataset(key, next);
  return next;
}
