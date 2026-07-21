import assert from 'node:assert/strict';
import { isPublicRoute } from './jwt.middleware';

function check(method: string, path: string, expected: boolean) {
  const actual = isPublicRoute(method, path);
  assert.equal(actual, expected, `${method} ${path} expected ${expected}, got ${actual}`);
}

check('GET', '/health', true);
check('GET', '/health/ready', true);
check('GET', '/metrics', true);
check('POST', '/api/auth/login', true);
check('POST', '/api/auth/register', true);
check('POST', '/api/auth/refresh', true);
check('GET', '/api/marketplace/products', true);
check('GET', '/api/marketplace/products/abc123', true);
check('GET', '/api/marketplace/products/creator/u1/listings', true);
check('GET', '/api/marketplace/products/favorites/user/u1', true);
check('GET', '/api/marketplace/products/mine', false);
check('GET', '/api/marketplace/products/favorites/mine', false);
check('POST', '/api/marketplace/products', false);
check('POST', '/api/marketplace/products/abc/favorite', false);
check('GET', '/api/users/u1/public', true);
check('GET', '/api/users/me', false);
check('GET', '/api/transactions/notifications/stream', true);
check('GET', '/api/transactions/notifications', false);
check('GET', '/api/transactions/reviews/product/p1', true);
check('POST', '/api/transactions/webhooks/stripe', true);
check('POST', '/api/transactions/webhooks/xendit', true);
check('GET', '/api/transactions/profile/u1/library', true);
check('GET', '/api/transactions/orders', false);

console.log('jwt.middleware.test.ts: all assertions passed');
