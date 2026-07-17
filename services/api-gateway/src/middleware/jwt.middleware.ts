import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface GatewayJwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

type PublicRule = {
  methods: string[];
  test: (pathname: string) => boolean;
};

const PUBLIC_RULES: PublicRule[] = [
  { methods: ['GET'], test: (p) => p === '/health' || p.startsWith('/health/') },
  { methods: ['GET'], test: (p) => p === '/metrics' },
  { methods: ['GET'], test: (p) => p.startsWith('/api/docs') },
  { methods: ['POST'], test: (p) => p === '/api/auth/login' },
  { methods: ['POST'], test: (p) => p === '/api/auth/register' },
  { methods: ['POST'], test: (p) => p === '/api/auth/refresh' },
  {
    methods: ['GET'],
    test: (p) => {
      if (p === '/api/marketplace/products') return true;
      if (p === '/api/marketplace/products/mine') return false;
      if (p === '/api/marketplace/products/favorites/mine') return false;
      if (p.startsWith('/api/marketplace/products/creator/')) return true;
      if (p.startsWith('/api/marketplace/products/favorites/user/')) return true;
      // GET /api/marketplace/products/:id (UUID/ObjectId style) — not nested actions
      const productIdMatch = /^\/api\/marketplace\/products\/[^/]+$/.test(p);
      return productIdMatch;
    },
  },
  {
    methods: ['GET'],
    test: (p) =>
      p === '/api/marketplace/categories' ||
      p.startsWith('/api/marketplace/categories/') ||
      p === '/api/marketplace/tags' ||
      p.startsWith('/api/marketplace/tags/'),
  },
  { methods: ['GET'], test: (p) => /^\/api\/users\/[^/]+\/public$/.test(p) },
  {
    methods: ['GET'],
    test: (p) =>
      p.startsWith('/api/images/files/') ||
      p === '/api/images/health' ||
      p.startsWith('/api/images/health/'),
  },
  { methods: ['POST'], test: (p) => p === '/api/transactions/webhooks/stripe' },
  // EventSource cannot set Authorization; token verified in transaction-service
  { methods: ['GET'], test: (p) => p === '/api/transactions/notifications/stream' },
  {
    methods: ['GET'],
    test: (p) =>
      p.startsWith('/api/transactions/profile/') &&
      (p.endsWith('/library') ||
        p.endsWith('/top-products') ||
        p.endsWith('/sales-count')),
  },
  {
    methods: ['GET'],
    test: (p) => /^\/api\/transactions\/reviews\/product\/[^/]+$/.test(p),
  },
];

export function isPublicRoute(method: string, path: string): boolean {
  const m = method.toUpperCase();
  const pathname = path.split('?')[0];
  return PUBLIC_RULES.some((rule) => rule.methods.includes(m) && rule.test(pathname));
}

export function createJwtMiddleware(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    delete req.headers['x-user-id'];
    delete req.headers['x-user-role'];
    delete req.headers['x-user-email'];

    if (isPublicRoute(req.method, req.path)) {
      return next();
    }

    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
    }

    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, secret) as GatewayJwtPayload;
      req.headers['x-user-id'] = payload.sub;
      req.headers['x-user-role'] = payload.role;
      req.headers['x-user-email'] = payload.email;
      return next();
    } catch {
      return res.status(401).json({ statusCode: 401, message: 'Invalid or expired token' });
    }
  };
}

export function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }
    return 'fallback-secret';
  }
  return secret;
}
