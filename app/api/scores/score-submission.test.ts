import assert from 'node:assert/strict';
import test from 'node:test';

import { validateScoreSubmission } from './score-submission.ts';

test('accepts valid score submissions', () => {
  for (const value of [
    { playerName: 'Player One', score: 0 },
    { playerName: '__manual_api_test__', score: 10 },
    { playerName: '玩家-2', score: 3990 },
  ]) {
    assert.deepEqual(validateScoreSubmission(value), { ok: true, value });
  }
});

test('rejects invalid request shapes', () => {
  for (const value of [
    null,
    [],
    {},
    { playerName: 'Player' },
    { playerName: 'Player', score: 10, admin: true },
  ]) {
    assert.equal(validateScoreSubmission(value).ok, false);
  }
});

test('rejects invalid player names', () => {
  for (const playerName of [
    '',
    ' Player',
    'Player ',
    'Player  One',
    'Player!',
    '🐍',
    'a'.repeat(25),
    123,
  ]) {
    assert.equal(validateScoreSubmission({ playerName, score: 10 }).ok, false);
  }
});

test('rejects invalid scores', () => {
  for (const score of [-10, 1, 10.5, 4000, '10', null, Number.NaN]) {
    assert.equal(validateScoreSubmission({ playerName: 'Player', score }).ok, false);
  }
});
