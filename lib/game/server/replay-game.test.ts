import assert from 'node:assert/strict';
import test from 'node:test';

import type { TurnLogEntry } from '../contracts/turn-log.ts';
import { MAX_DIRECTION_CHANGES } from '../engine.ts';
import {
  calculateFinalScore,
  InvalidReplayError,
  replayGame,
} from './replay-game.ts';

function createTurnLimitLog() {
  const directions = ['DOWN', 'LEFT', 'UP', 'RIGHT'] as const;
  const turnLog: TurnLogEntry[] = [];

  for (let index = 0; index < MAX_DIRECTION_CHANGES; index += 1) {
    turnLog.push({
      movesSincePreviousTurn: index === 0 ? '0' : '1',
      direction: directions[index % directions.length],
    });
  }

  return turnLog;
}

test('replays a terminal game from relative turn distances', () => {
  const state = replayGame(42, {
    turnLog: createTurnLimitLog(),
    movesAfterLastTurn: '1',
  });

  assert.equal(state.result, 'TURN_LIMIT_REACHED');
  assert.equal(state.turnsUsed, MAX_DIRECTION_CHANGES);
  assert.equal(state.tick, MAX_DIRECTION_CHANGES);
});

test('rejects a direction change that the engine would not accept', () => {
  assert.throws(
    () => replayGame(42, {
      turnLog: [{ movesSincePreviousTurn: '0', direction: 'LEFT' }],
      movesAfterLastTurn: '1',
    }),
    InvalidReplayError,
  );
});

test('rejects an operation log that does not finish the game', () => {
  assert.throws(
    () => replayGame(42, { turnLog: [], movesAfterLastTurn: '1' }),
    InvalidReplayError,
  );
});

test('rejects operations after the replay has already ended', () => {
  assert.throws(
    () => replayGame(42, {
      turnLog: createTurnLimitLog(),
      movesAfterLastTurn: '2',
    }),
    InvalidReplayError,
  );
});

test('final score rewards the same food score when fewer turns are used', () => {
  const efficient = calculateFinalScore({
    ...replayGame(42, {
      turnLog: createTurnLimitLog(),
      movesAfterLastTurn: '1',
    }),
    score: 100,
    turnsUsed: 10,
  });
  const inefficient = calculateFinalScore({
    ...replayGame(42, {
      turnLog: createTurnLimitLog(),
      movesAfterLastTurn: '1',
    }),
    score: 100,
    turnsUsed: 90,
  });

  assert.ok(efficient > inefficient);
  assert.equal(efficient, 198);
  assert.equal(inefficient, 152);
});
