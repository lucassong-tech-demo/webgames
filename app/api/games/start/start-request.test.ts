import assert from 'node:assert/strict';
import test from 'node:test';

import { validateStartRequest } from './start-request.ts';

test('accepts a POST request without a body', async () => {
  const request = new Request('http://localhost/api/games/start', { method: 'POST' });

  assert.deepEqual(await validateStartRequest(request), { ok: true });
});

test('accepts an explicitly empty request body', async () => {
  const request = new Request('http://localhost/api/games/start', {
    method: 'POST',
    body: '',
  });

  assert.deepEqual(await validateStartRequest(request), { ok: true });
});

test('rejects a non-empty request body', async () => {
  const request = new Request('http://localhost/api/games/start', {
    method: 'POST',
    body: '{}',
  });

  assert.deepEqual(await validateStartRequest(request), {
    ok: false,
    error: 'Request body must be empty',
  });
});

test('rejects invalid Content-Length before reading the body', async () => {
  const request = new Request('http://localhost/api/games/start', {
    method: 'POST',
    headers: { 'Content-Length': 'invalid' },
  });

  assert.deepEqual(await validateStartRequest(request), {
    ok: false,
    error: 'Content-Length must be a non-negative integer',
  });
});
