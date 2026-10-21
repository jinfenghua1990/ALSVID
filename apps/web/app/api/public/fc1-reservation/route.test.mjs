import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('./route.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
});

function loadRoute({ apiBase = 'https://api.example.test/api', upstream } = {}) {
  const module = { exports: {} };
  const requests = [];
  const response = {
    json(body, options = {}) { return { body, status: options.status ?? 200 }; },
  };
  runInNewContext(outputText, {
    module,
    exports: module.exports,
    require: (name) => {
      if (name === 'next/server') return { NextResponse: response };
      throw new Error('Unexpected import: ' + name);
    },
    process: { env: { ALSVID_API_BASE_URL: apiBase } },
    URL,
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (upstream === 'error') throw new Error('upstream unreachable');
      return { status: 200, json: async () => ({ data: { ok: true } }) };
    },
  });
  return { POST: module.exports.POST, requests };
}

function makeRequest(body, origin = 'https://www.alsvidbike.com') {
  return new Request('https://www.alsvidbike.com/api/public/fc1-reservation', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body,
  });
}

test('public reservation endpoint blocks foreign origins before calling upstream', async () => {
  const route = loadRoute();
  const result = await route.POST(makeRequest('{}', 'https://attacker.invalid'));
  assert.equal(result.status, 403);
  assert.equal(route.requests.length, 0);
});

test('malformed or oversized reservation bodies are rejected', async () => {
  const route = loadRoute();
  const malformed = await route.POST(makeRequest('{invalid'));
  assert.equal(malformed.status, 400);
  const large = await route.POST(makeRequest(JSON.stringify({ email: 'a@b.com', text: 'x'.repeat(2100) })));
  assert.equal(large.status, 413);
  assert.equal(route.requests.length, 0);
});

test('a valid reservation request forwards JSON to the existing API', async () => {
  const route = loadRoute();
  const result = await route.POST(makeRequest(JSON.stringify({ email: 'customer@example.com' })));
  assert.equal(result.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(result.body)), { data: { ok: true } });
  assert.equal(route.requests.length, 1);
  assert.equal(route.requests[0].url, 'https://api.example.test/api/v1/public/fc1-reservations');
  assert.equal(route.requests[0].options.method, 'POST');
});

test('email service outages remain unavailable instead of reporting success', async () => {
  const route = loadRoute({ upstream: 'error' });
  const result = await route.POST(makeRequest('{"email":"customer@example.com"}'));
  assert.equal(result.status, 503);
});
