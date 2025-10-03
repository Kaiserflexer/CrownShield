import { put } from '@vercel/blob';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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

type ReadonlyFsError = { code?: string };

function isReadonlyFsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const { code } = error as ReadonlyFsError;
  return code === 'EROFS' || code === 'EACCES' || code === 'EPERM';
}

let resolvedBaseDir: string | null | undefined;
let testingBaseDirCandidates: string[] | null = null;

function getBaseDirCandidates(): string[] {
  if (testingBaseDirCandidates) {
    return testingBaseDirCandidates;
  }

  const configured = process.env.DATA_DIR;
  const defaults = [process.cwd(), '/tmp/crownshield'];
  if (configured) {
    return [configured, ...defaults];
  }

  return defaults;
}

async function ensureWritableDirectory(dir: string): Promise<boolean> {
  try {
    await mkdir(dir, { recursive: true });
    const probe = join(dir, '.write-test');
    await writeFile(probe, '', 'utf8');
    await rm(probe, { force: true });
    return true;
  } catch (error: unknown) {
    if (isReadonlyFsError(error)) {
      return false;
    }
    if (error && typeof error === 'object' && 'code' in error && (error as ReadonlyFsError).code === 'EEXIST') {
      return false;
    }
    throw error;
  }
}

async function resolveWritableBaseDir(): Promise<string | null> {
  if (resolvedBaseDir !== undefined) {
    return resolvedBaseDir;
  }

  for (const candidate of getBaseDirCandidates()) {
    if (await ensureWritableDirectory(candidate)) {
      resolvedBaseDir = candidate;
      return candidate;
    }
  }

  resolvedBaseDir = null;
  return null;
}

export async function readDataset<T>(key: DatasetKey, fallback: T): Promise<T> {
  const path = DATASET_PATHS[key];
  const baseDir = await resolveWritableBaseDir();
  const localPath = baseDir ? join(baseDir, path) : null;

  const blobValue = await readFromBlob(path);
  if (blobValue) {
    return JSON.parse(blobValue) as T;
  }

  const fsValue = localPath ? await readFromFs(localPath) : null;
  if (fsValue) {
    return JSON.parse(fsValue) as T;
  }

  if (localPath) {
    try {
      await writeToFs(localPath, JSON.stringify(fallback, null, 2));
    } catch (error: unknown) {
      if (!isReadonlyFsError(error)) {
        throw error;
      }
    }
  }

  if (token) {
    await writeToBlob(path, JSON.stringify(fallback));
  }
  return fallback;
}

export async function writeDataset<T>(key: DatasetKey, data: T): Promise<void> {
  const path = DATASET_PATHS[key];
  const baseDir = await resolveWritableBaseDir();
  const localPath = baseDir ? join(baseDir, path) : null;
  const serialized = JSON.stringify(data, null, 2);
  if (localPath) {
    try {
      await writeToFs(localPath, serialized);
    } catch (error: unknown) {
      if (!isReadonlyFsError(error)) {
        throw error;
      }
    }
  }
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

export const __storageTestUtils = {
  resetBaseDirectoryCache(): void {
    resolvedBaseDir = undefined;
  },
  setBaseDirectoryCandidates(candidates: string[] | null): void {
    testingBaseDirCandidates = candidates;
    resolvedBaseDir = undefined;
  }
};
