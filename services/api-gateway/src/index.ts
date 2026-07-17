import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger-spec';
import { resolveServiceUrl, registerWithConsul } from './consul/register';
import { correlationMiddleware } from './middleware/correlation.middleware';
import { createJwtMiddleware, resolveJwtSecret } from './middleware/jwt.middleware';
import { metricsHandler, metricsMiddleware } from './middleware/metrics.middleware';

dotenv.config();

async function bootstrap() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const jwtSecret = resolveJwtSecret();

  const AUTH_SERVICE_URL = await resolveServiceUrl(
    'auth-service',
    process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  );
  const MARKETPLACE_SERVICE_URL = await resolveServiceUrl(
    'marketplace-service',
    process.env.MARKETPLACE_SERVICE_URL || 'http://marketplace-service:3002',
  );
  const TRANSACTION_SERVICE_URL = await resolveServiceUrl(
    'transaction-service',
    process.env.TRANSACTION_SERVICE_URL || 'http://transaction-service:3003',
  );
  const IMAGE_PROCESSOR_URL =
    process.env.IMAGE_PROCESSOR_URL || 'http://image-processor:5000';

  console.log('Upstream targets', {
    AUTH_SERVICE_URL,
    MARKETPLACE_SERVICE_URL,
    TRANSACTION_SERVICE_URL,
    IMAGE_PROCESSOR_URL,
  });

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cors({ origin: true, credentials: true }));
  app.use(correlationMiddleware);
  app.use(morgan('dev'));
  app.use(metricsMiddleware);

  const isDev = process.env.NODE_ENV !== 'production';
  const rateLimitMax = parseInt(
    process.env.RATE_LIMIT_MAX_REQUESTS || (isDev ? '2000' : '100'),
    10,
  );

  if (rateLimitMax > 0) {
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      max: rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: { statusCode: 429, message: 'Too many requests, please try again later.' },
      skip: (req) =>
        req.path === '/health' ||
        req.path.startsWith('/health/') ||
        req.path === '/metrics' ||
        req.path.includes('/notifications/stream') ||
        req.path.startsWith('/api/docs'),
    });
    app.use(limiter);
  }

  app.use(createJwtMiddleware(jwtSecret));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
  });
  app.get('/health/live', (_req, res) => {
    res.json({ status: 'ok', service: 'api-gateway', check: 'live' });
  });
  app.get('/health/ready', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'api-gateway',
      check: 'ready',
      upstreams: {
        auth: AUTH_SERVICE_URL,
        marketplace: MARKETPLACE_SERVICE_URL,
        transaction: TRANSACTION_SERVICE_URL,
        images: IMAGE_PROCESSOR_URL,
      },
    });
  });
  app.get('/metrics', metricsHandler);

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  const sendUpstreamUnavailable = (target: string, err: Error, res: express.Response | import('net').Socket) => {
    console.error(`Proxy error to ${target}:`, err.message);
    if ('headersSent' in res && !res.headersSent && 'status' in res) {
      res.status(502).json({ statusCode: 502, message: 'Upstream service unavailable' });
    }
  };

  const proxyOptions = (target: string, stripPrefix: string) => ({
    target,
    changeOrigin: true,
    pathRewrite: { [`^${stripPrefix}`]: '' },
    proxyTimeout: 0,
    timeout: 0,
    on: {
      proxyReq: (proxyReq: import('http').ClientRequest, req: express.Request) => {
        const correlationId = req.headers['x-correlation-id'];
        if (typeof correlationId === 'string') {
          proxyReq.setHeader('x-correlation-id', correlationId);
        }
        if (req.headers['x-user-id']) {
          proxyReq.setHeader('x-user-id', String(req.headers['x-user-id']));
        }
        if (req.headers['x-user-role']) {
          proxyReq.setHeader('x-user-role', String(req.headers['x-user-role']));
        }
        if (req.headers['x-user-email']) {
          proxyReq.setHeader('x-user-email', String(req.headers['x-user-email']));
        }
      },
      proxyRes: (proxyRes: import('http').IncomingMessage, req: express.Request) => {
        if (req.path.includes('/notifications/stream')) {
          proxyRes.headers['x-accel-buffering'] = 'no';
          proxyRes.headers['cache-control'] = 'no-cache, no-transform';
          proxyRes.headers['connection'] = 'keep-alive';
        }
      },
      error: (err: Error, _req: express.Request, res: express.Response | import('net').Socket) => {
        sendUpstreamUnavailable(target, err, res);
      },
    },
  });

  app.use(
    '/api/auth',
    createProxyMiddleware({
      target: AUTH_SERVICE_URL,
      changeOrigin: true,
      pathRewrite: (path) => `/auth${path}`,
      on: {
        proxyReq: (proxyReq, req) => {
          const correlationId = req.headers['x-correlation-id'];
          if (typeof correlationId === 'string') {
            proxyReq.setHeader('x-correlation-id', correlationId);
          }
        },
        error: (err: Error, _req: express.Request, res: express.Response | import('net').Socket) => {
          sendUpstreamUnavailable(AUTH_SERVICE_URL, err, res);
        },
      },
    }),
  );
  app.use(
    '/api/marketplace',
    createProxyMiddleware(proxyOptions(MARKETPLACE_SERVICE_URL, '/api/marketplace')),
  );
  app.use(
    '/api/users',
    createProxyMiddleware({
      target: AUTH_SERVICE_URL,
      changeOrigin: true,
      pathRewrite: (path) => `/users${path}`,
      proxyTimeout: 0,
      timeout: 0,
      on: {
        proxyReq: (proxyReq, req) => {
          const correlationId = req.headers['x-correlation-id'];
          if (typeof correlationId === 'string') {
            proxyReq.setHeader('x-correlation-id', correlationId);
          }
          if (req.headers['x-user-id']) {
            proxyReq.setHeader('x-user-id', String(req.headers['x-user-id']));
          }
        },
        error: (err: Error, _req: express.Request, res: express.Response | import('net').Socket) => {
          sendUpstreamUnavailable(AUTH_SERVICE_URL, err, res);
        },
      },
    }),
  );
  app.use(
    '/api/transactions',
    createProxyMiddleware(proxyOptions(TRANSACTION_SERVICE_URL, '/api/transactions')),
  );
  app.use('/api/images', createProxyMiddleware(proxyOptions(IMAGE_PROCESSOR_URL, '/api/images')));

  app.use((_req, res) => {
    res.status(404).json({ statusCode: 404, message: 'Route not found' });
  });

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`VividCraft API Gateway running on port ${PORT}`);
    console.log(`Swagger docs available at http://localhost:${PORT}/api/docs`);
    await registerWithConsul({ name: 'api-gateway', port: PORT, healthPath: '/health/ready' });
  });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
