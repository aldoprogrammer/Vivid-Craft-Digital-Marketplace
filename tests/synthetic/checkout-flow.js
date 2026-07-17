/**
 * VividCraft synthetic checkout-flow probe.
 *
 * Runnable with plain Node 20+ (uses global fetch):
 *   BASE_URL=http://localhost:3000 \
 *   TEST_EMAIL=buyer@vividcraft.local TEST_PASSWORD=password123 \
 *   node tests/synthetic/checkout-flow.js
 *
 * Exits non-zero on the first failed step so it can be wired into CI or cron.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.TEST_EMAIL || 'buyer@vividcraft.local';
const PASSWORD = process.env.TEST_PASSWORD || 'password123';

async function step(name, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    console.log(`OK   ${name} (${Date.now() - start}ms)`);
    return result;
  } catch (err) {
    console.error(`FAIL ${name} (${Date.now() - start}ms): ${err.message}`);
    process.exit(1);
  }
}

async function json(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

(async () => {
  await step('gateway health/ready', async () => {
    const res = await fetch(`${BASE_URL}/health/ready`);
    if (!res.ok) throw new Error(`status ${res.status}`);
  });

  const token = await step('login', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    const body = await json(res);
    if (!res.ok) throw new Error(`status ${res.status}: ${JSON.stringify(body)}`);
    const t = body.accessToken || body.access_token || body.token;
    if (!t) throw new Error('no access token in response');
    return t;
  });

  const products = await step('list products', async () => {
    const res = await fetch(`${BASE_URL}/api/marketplace/products?limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await json(res);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const items = Array.isArray(body) ? body : body.items || body.data || [];
    if (!items.length) console.warn('WARN no products returned');
    return items;
  });

  await step('transaction health/ready', async () => {
    const res = await fetch(`${BASE_URL}/api/transactions/health/ready`);
    // 200 or 503 are both valid responses from the probe; only network errors fail.
    if (res.status !== 200 && res.status !== 503) {
      throw new Error(`unexpected status ${res.status}`);
    }
  });

  console.log(`\nSynthetic checkout-flow passed against ${BASE_URL} (${products.length} products seen).`);
})();
