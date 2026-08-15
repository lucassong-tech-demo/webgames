import assert from 'node:assert/strict';
import test from 'node:test';

import { validateFinishRequest } from './finish-request.ts';

const validRequest = {
  sessionId: '123e4567-e89b-42d3-a456-426614174000',
  playerName: 'Player One',
  score: 100,
};

test('accepts a strictly shaped finish request', () => {
  assert.deepEqual(validateFinishRequest(validRequest), {
    ok: true,
    value: validRequest,
  });
});

test('rejects malformed finish request fields', () => {
  for (const value of [
    null,
    {},
    { ...validRequest, admin: true },
    { ...validRequest, sessionId: 'not-a-uuid' },
    { ...validRequest, playerName: ' Player' },
    { ...validRequest, score: '100' },
  ]) {
    assert.equal(validateFinishRequest(value).ok, false);
  }
});

test('accepts only attainable integer scores', () => {
  for (const score of [-10, 1, 10.5, 1000, '100', null]) {
    assert.equal(validateFinishRequest({ ...validRequest, score }).ok, false);
  }

  assert.equal(validateFinishRequest({ ...validRequest, score: 0 }).ok, true);
  assert.equal(validateFinishRequest({ ...validRequest, score: 990 }).ok, true);
});
