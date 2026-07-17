import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

export const CORRELATION_HEADER = 'x-correlation-id';

type CorrelationStore = { correlationId: string };

export const correlationStorage = new AsyncLocalStorage<CorrelationStore>();

export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.correlationId;
}

export function correlationMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers[CORRELATION_HEADER];
  const correlationId =
    typeof incoming === 'string' && incoming.trim() ? incoming.trim() : randomUUID();

  req.headers[CORRELATION_HEADER] = correlationId;
  res.setHeader(CORRELATION_HEADER, correlationId);

  correlationStorage.run({ correlationId }, () => next());
}
