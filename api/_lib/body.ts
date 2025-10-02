import type { VercelRequest } from '@vercel/node';

export async function readJsonBody<T = unknown>(req: VercelRequest): Promise<T | null> {
  if (req.body) {
    return req.body as T;
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) {
    return null;
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as T;
}
