import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { assertDatabaseTarget } from './index.js';

test('business runtime requires approved database', () => {
  assertDatabaseTarget('postgresql://x:x@ep-shy-truth-b9laycln-pooler.c-7.eu-central-1.aws.neon.tech/db', {});
  for (const url of ['postgresql://x:x@localhost:5434/alsvid', 'postgresql://x:x@other.example/db']) assert.throws(() => assertDatabaseTarget(url, {}));
  assert.throws(() => assertDatabaseTarget('postgresql://x:x@localhost/db', {NODE_ENV:'test'}));
  assertDatabaseTarget('postgresql://x:x@postgres/alsvid_test', {NODE_ENV:'test', GITHUB_ACTIONS:'true'});
  assert.throws(() => assertDatabaseTarget('postgresql://x:x@other.example/db', {NODE_ENV:'test', GITHUB_ACTIONS:'true'}));
});
