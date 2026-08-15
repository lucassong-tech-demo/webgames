import assert from 'node:assert/strict';
import test from 'node:test';

import { createGameState } from '../engine.ts';
import { gameReducer } from './game-state.ts';

test('applies movement and accepted direction changes', () => {
  const initial = createGameState(42);
  const turned = gameReducer(initial, { type: 'change-direction', direction: 'DOWN' });
  const moved = gameReducer(turned, { type: 'advance' });

  assert.equal(turned.direction, 'DOWN');
  assert.equal(turned.turnsUsed, 1);
  assert.equal(moved.tick, 1);
});

test('reset creates a fresh game using the supplied seed', () => {
  const reset = gameReducer(createGameState(42), { type: 'reset', seed: 99 });

  assert.equal(reset.seed, 99);
  assert.equal(reset.tick, 0);
  assert.equal(reset.turnsUsed, 0);
});
