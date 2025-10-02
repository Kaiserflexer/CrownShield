import type { VercelRequest, VercelResponse } from '@vercel/node';

export type Handler<T = unknown> = (
  req: VercelRequest,
  res: VercelResponse
) => T | Promise<T>;

export function sendJson(res: VercelResponse, status: number, payload: unknown): void {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload));
}

export function getClientIp(req: VercelRequest): string {
  const header = req.headers['x-forwarded-for'];
  if (!header) {
    return req.socket.remoteAddress ?? 'unknown';
  }
  if (Array.isArray(header)) {
    return header[0];
  }
  return header.split(',')[0].trim();
}
