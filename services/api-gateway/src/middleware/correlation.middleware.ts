import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

export const CORRELATION_HEADER = 'x-correlation-id';

export function correlationMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers[CORRELATION_HEADER];
  const correlationId =
    typeof incoming === 'string' && incoming.trim() ? incoming.trim() : randomUUID();

  req.headers[CORRELATION_HEADER] = correlationId;
  res.setHeader(CORRELATION_HEADER, correlationId);
  next();
}
