import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import jwt from 'jsonwebtoken';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { sendJson } from '../_lib/http';

interface UploadTokenPayload {
  pathname: string;
  contentType: string;
  resource: 'video' | 'poster';
  sub: string;
  limit: number;
  exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    sendJson(res, 401, { error: 'Missing upload token' });
    return;
  }

  const token = authHeader.replace(/^[Bb]earer\s+/, '').trim();
  let payload: UploadTokenPayload;
  try {
    payload = jwt.verify(token, JWT_SECRET) as UploadTokenPayload;
  } catch (error) {
    sendJson(res, 401, { error: 'Invalid upload token' });
    return;
  }

  const contentLength = Number(req.headers['content-length'] ?? '0');
  if (payload.limit && contentLength > payload.limit) {
    sendJson(res, 413, { error: 'File too large' });
    return;
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    const buffers: Buffer[] = [];
    for await (const chunk of req) {
      buffers.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(buffers);
    if (payload.limit && buffer.byteLength > payload.limit) {
      sendJson(res, 413, { error: 'File too large' });
      return;
    }
    const publicDir = join(process.cwd(), 'public', dirname(payload.pathname));
    await mkdir(publicDir, { recursive: true });
    const filePath = join(process.cwd(), 'public', payload.pathname);
    await writeFile(filePath, buffer);
    const url = `/${payload.pathname}`;
    sendJson(res, 200, { url, pathname: payload.pathname });
    return;
  }

  try {
    const result = await put(payload.pathname, req, {
      access: 'public',
      token: blobToken,
      contentType: payload.contentType,
      addRandomSuffix: false
    });
    sendJson(res, 200, { url: result.url, pathname: result.pathname });
  } catch (error) {
    sendJson(res, 500, { error: (error as Error).message });
  }
}
