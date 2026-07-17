import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

const SERVICE = 'auth-service';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service'] as const,
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

function routeLabel(path: string): string {
  const clean = path.split('?')[0] || 'unknown';
  if (clean.startsWith('/health')) return clean;
  if (clean.startsWith('/users/') && clean.endsWith('/public')) return '/users/:id/public';
  if (/^\/users\/[^/]+$/.test(clean)) return '/users/:id';
  return clean;
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/metrics') return next();
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const labels = {
      method: req.method,
      route: routeLabel(req.path),
      status_code: String(res.statusCode),
      service: SERVICE,
    };
    httpRequestsTotal.inc(labels);
    end(labels);
  });
  next();
}

export async function metricsHandler(_req: Request, res: Response) {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
}
