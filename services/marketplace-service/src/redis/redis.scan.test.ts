/**
 * Lightweight unit test for SCAN-based invalidation semantics (mocked).
 * Run: npx ts-node --transpile-only src/redis/redis.scan.test.ts
 */
import assert from 'node:assert/strict';

async function delPatternScan(
  scan: (cursor: string) => Promise<[string, string[]]>,
  unlink: (keys: string[]) => Promise<void>,
): Promise<number> {
  let cursor = '0';
  let removed = 0;
  do {
    const [next, keys] = await scan(cursor);
    cursor = next;
    if (keys.length > 0) {
      await unlink(keys);
      removed += keys.length;
    }
  } while (cursor !== '0');
  return removed;
}

async function run() {
  const pages: Record<string, [string, string[]]> = {
    '0': ['1', ['products:a', 'products:b']],
    '1': ['0', ['products:c']],
  };
  const deleted: string[] = [];
  const count = await delPatternScan(
    async (c) => pages[c],
    async (keys) => {
      deleted.push(...keys);
    },
  );
  assert.equal(count, 3);
  assert.deepEqual(deleted, ['products:a', 'products:b', 'products:c']);
  console.log('redis.scan.test.ts: all assertions passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
