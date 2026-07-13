import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger-spec';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
const MARKETPLACE_SERVICE_URL = process.env.MARKETPLACE_SERVICE_URL || 'http://marketplace-service:3002';
const TRANSACTION_SERVICE_URL = process.env.TRANSACTION_SERVICE_URL || 'http://transaction-service:3003';
const IMAGE_PROCESSOR_URL = process.env.IMAGE_PROCESSOR_URL || 'http://image-processor:5000';

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { statusCode: 429, message: 'Too many requests, please try again later.' },
});
app.use(limiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const proxyOptions = (target: string, stripPrefix: string) => ({
  target,
  changeOrigin: true,
  pathRewrite: { [`^${stripPrefix}`]: '' },
  on: {
    error: (err: Error, _req: express.Request, res: express.Response) => {
      console.error(`Proxy error to ${target}:`, err.message);
      if (!res.headersSent) {
        res.status(502).json({ statusCode: 502, message: 'Upstream service unavailable' });
      }
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
      error: (err: Error, _req: express.Request, res: express.Response) => {
        console.error(`Proxy error to ${AUTH_SERVICE_URL}:`, err.message);
        if (!res.headersSent) {
          res.status(502).json({ statusCode: 502, message: 'Upstream service unavailable' });
        }
      },
    },
  }),
);
app.use('/api/marketplace', createProxyMiddleware(proxyOptions(MARKETPLACE_SERVICE_URL, '/api/marketplace')));
app.use('/api/transactions', createProxyMiddleware(proxyOptions(TRANSACTION_SERVICE_URL, '/api/transactions')));
app.use('/api/images', createProxyMiddleware(proxyOptions(IMAGE_PROCESSOR_URL, '/api/images')));

app.use((_req, res) => {
  res.status(404).json({ statusCode: 404, message: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`VividCraft API Gateway running on port ${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api/docs`);
});
