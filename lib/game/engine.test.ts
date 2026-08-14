import assert from 'node:assert/strict';
import test from 'node:test';

import {
  advanceGame,
  changeDirection,
  createGameState,
  nextRandomUint32,
  type Direction,
  type GameState,
} from './engine.ts';

test('seeded PRNG produces a stable sequence', () => {
  const first = nextRandomUint32(123456789);
  const second = nextRandomUint32(first.state);
  const third = nextRandomUint32(second.state);

  assert.deepEqual([first, second, third], [
    { state: 1955022602, value: 1107202814 },
    { state: 3786588415, value: 4169434471 },
    { state: 1323186932, value: 3372958138 },
  ]);
});

test('the same seed and inputs produce identical states', () => {
  const play = () => {
    let state = createGameState(42);
    const inputs = new Map<number, Direction>([
      [2, 'DOWN'],
      [5, 'LEFT'],
      [8, 'UP'],
    ]);

    for (let tick = 0; tick < 12; tick += 1) {
      const direction = inputs.get(tick);
      if (direction) state = changeDirection(state, direction);
      state = advanceGame(state);
    }

    return state;
  };

  assert.deepEqual(play(), play());
});

test('rejects immediate reverse direction changes', () => {
  const state = createGameState(1);

  assert.strictEqual(changeDirection(state, 'LEFT'), state);
  const turned = changeDirection(state, 'DOWN');
  assert.equal(turned.direction, 'DOWN');
  assert.strictEqual(changeDirection(turned, 'LEFT'), turned);
  assert.equal(changeDirection(advanceGame(turned), 'LEFT').direction, 'LEFT');
});

test('wraps movement at the board edge', () => {
  const state: GameState = {
    ...createGameState(1),
    snake: [{ x: 19, y: 5 }],
    food: { x: 10, y: 10 },
  };

  assert.deepEqual(advanceGame(state).snake[0], { x: 0, y: 5 });
});

test('eating food grows the snake and increments the score', () => {
  const state: GameState = {
    ...createGameState(7),
    snake: [{ x: 10, y: 10 }],
    food: { x: 11, y: 10 },
  };
  const next = advanceGame(state);

  assert.equal(next.tick, 1);
  assert.equal(next.snake.length, 2);
  assert.equal(next.score, 10);
  assert.notDeepEqual(next.food, state.food);
});

test('self-collision ends the game without mutating the input state', () => {
  const snake = [
    { x: 2, y: 2 },
    { x: 2, y: 3 },
    { x: 1, y: 3 },
    { x: 1, y: 2 },
  ];
  const state: GameState = {
    ...createGameState(9),
    snake,
    direction: 'LEFT',
    food: { x: 10, y: 10 },
  };
  const next = advanceGame(state);

  assert.equal(next.gameOver, true);
  assert.equal(next.tick, 1);
  assert.deepEqual(next.snake, snake);
  assert.equal(state.gameOver, false);
});
