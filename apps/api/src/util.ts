import type { NextFunction, Request, RequestHandler, Response } from 'express';

export function newId(prefix: string): string {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// Replace lone surrogates (which Postgres rejects as "unsupported Unicode escape
// sequence") with U+FFFD, preserving valid surrogate pairs such as emoji.
function cleanString(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = s.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += s[i] + s[i + 1];
        i++;
      } else {
        out += '\ufffd';
      }
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      out += '\ufffd';
    } else {
      out += s[i];
    }
  }
  return out;
}

export function sanitizeForPostgres<T>(value: T): T {
  if (typeof value === 'string') return cleanString(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => sanitizeForPostgres(v)) as unknown as T;
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeForPostgres(v);
    }
    return out as unknown as T;
  }
  return value;
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

// Wraps an async Express handler so rejected promises reach the error handler.
export function wrap(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
