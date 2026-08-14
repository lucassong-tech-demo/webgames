import assert from 'node:assert/strict';
import test from 'node:test';

import { MAX_REPLAY_MOVES } from '../../../../lib/game/server/replay-game.ts';
import { validateFinishRequest } from './finish-request.ts';

const validRequest = {
  sessionId: '123e4567-e89b-42d3-a456-426614174000',
  playerName: 'Player One',
  turnLog: [{ movesSincePreviousTurn: '0', direction: 'DOWN' }],
  movesAfterLastTurn: '1',
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
    { ...validRequest, turnLog: 'invalid' },
    { ...validRequest, movesAfterLastTurn: 1 },
    { ...validRequest, movesAfterLastTurn: '01' },
  ]) {
    assert.equal(validateFinishRequest(value).ok, false);
  }
});

test('rejects invalid turns and more than 100 turns', () => {
  for (const turn of [
    null,
    {},
    { movesSincePreviousTurn: '1', direction: 'INVALID' },
    { movesSincePreviousTurn: 1, direction: 'DOWN' },
    { movesSincePreviousTurn: '1', direction: 'DOWN', extra: true },
  ]) {
    assert.equal(validateFinishRequest({ ...validRequest, turnLog: [turn] }).ok, false);
  }

  assert.equal(
    validateFinishRequest({
      ...validRequest,
      turnLog: Array.from({ length: 101 }, () => validRequest.turnLog[0]),
    }).ok,
    false,
  );
});

test('bounds total replay work independently of request size', () => {
  assert.equal(
    validateFinishRequest({
      ...validRequest,
      turnLog: [{ movesSincePreviousTurn: String(MAX_REPLAY_MOVES), direction: 'DOWN' }],
      movesAfterLastTurn: '1',
    }).ok,
    false,
  );
});
