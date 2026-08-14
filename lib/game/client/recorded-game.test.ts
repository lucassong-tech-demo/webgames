import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRecordedGame,
  getMovesAfterLastTurn,
  recordedGameReducer,
} from './recorded-game.ts';

test('records an accepted direction at the tick where it is applied', () => {
  const initial = createRecordedGame(42);
  const changed = recordedGameReducer(initial, {
    type: 'change-direction',
    direction: 'DOWN',
  });

  assert.equal(changed.game.direction, 'DOWN');
  assert.equal(changed.game.turnsUsed, 1);
  assert.deepEqual(changed.turnLog, [
    { movesSincePreviousTurn: '0', direction: 'DOWN' },
  ]);
});

test('does not record rejected or redundant direction inputs', () => {
  const initial = createRecordedGame(42);

  assert.strictEqual(
    recordedGameReducer(initial, { type: 'change-direction', direction: 'LEFT' }),
    initial,
  );
  assert.strictEqual(
    recordedGameReducer(initial, { type: 'change-direction', direction: 'RIGHT' }),
    initial,
  );

  const changed = recordedGameReducer(initial, {
    type: 'change-direction',
    direction: 'DOWN',
  });

  assert.strictEqual(
    recordedGameReducer(changed, { type: 'change-direction', direction: 'LEFT' }),
    changed,
  );
  assert.deepEqual(changed.turnLog, [
    { movesSincePreviousTurn: '0', direction: 'DOWN' },
  ]);
});

test('records at most one accepted direction per tick', () => {
  let state = createRecordedGame(42);

  state = recordedGameReducer(state, { type: 'change-direction', direction: 'DOWN' });
  state = recordedGameReducer(state, { type: 'advance' });
  state = recordedGameReducer(state, { type: 'change-direction', direction: 'LEFT' });

  assert.deepEqual(state.turnLog, [
    { movesSincePreviousTurn: '0', direction: 'DOWN' },
    { movesSincePreviousTurn: '1', direction: 'LEFT' },
  ]);
  assert.equal(getMovesAfterLastTurn(state), '0');
});

test('reset starts a new game and clears the input log', () => {
  let state = createRecordedGame(42);
  state = recordedGameReducer(state, { type: 'change-direction', direction: 'DOWN' });

  const reset = recordedGameReducer(state, { type: 'reset', seed: 99 });

  assert.equal(reset.game.seed, 99);
  assert.equal(reset.game.tick, 0);
  assert.deepEqual(reset.turnLog, []);
  assert.equal(reset.previousTurnTick, 0);
});
