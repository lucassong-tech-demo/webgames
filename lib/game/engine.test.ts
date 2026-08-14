import assert from 'node:assert/strict';
import test from 'node:test';

import {
  advanceGame,
  BOARD_SIZE,
  changeDirection,
  createGameState,
  ENGINE_VERSION,
  MAX_DIRECTION_CHANGES,
  nextRandomUint32,
  SCORE_PER_FOOD,
  WIN_SNAKE_LENGTH,
  type Direction,
  type GameState,
} from './engine.ts';

test('uses the turn-limited game rules protocol', () => {
  assert.equal(ENGINE_VERSION, 2);
  assert.equal(MAX_DIRECTION_CHANGES, 100);
  assert.equal(WIN_SNAKE_LENGTH, 100);
});

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
  assert.equal(turned.turnsUsed, 1);
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

test('reaching the target snake length wins the game', () => {
  const head = { x: 10, y: 10 };
  const nextHead = { x: 11, y: 10 };
  const body = [];

  for (let y = 0; y < BOARD_SIZE && body.length < WIN_SNAKE_LENGTH - 2; y += 1) {
    for (let x = 0; x < BOARD_SIZE && body.length < WIN_SNAKE_LENGTH - 2; x += 1) {
      if ((x !== head.x || y !== head.y) && (x !== nextHead.x || y !== nextHead.y)) {
        body.push({ x, y });
      }
    }
  }

  const state: GameState = {
    ...createGameState(7),
    snake: [head, ...body],
    food: nextHead,
    score: (WIN_SNAKE_LENGTH - 2) * SCORE_PER_FOOD,
  };
  const next = advanceGame(state);

  assert.equal(next.snake.length, WIN_SNAKE_LENGTH);
  assert.equal(next.score, (WIN_SNAKE_LENGTH - 1) * SCORE_PER_FOOD);
  assert.equal(next.result, 'WON');
  assert.equal(next.food, null);
});

test('the final allowed turn takes effect for one move before ending the game', () => {
  const state: GameState = {
    ...createGameState(11),
    turnsUsed: MAX_DIRECTION_CHANGES - 1,
    food: { x: 0, y: 0 },
  };
  const turned = changeDirection(state, 'DOWN');
  const next = advanceGame(turned);

  assert.equal(turned.turnsUsed, MAX_DIRECTION_CHANGES);
  assert.deepEqual(next.snake[0], { x: 10, y: 11 });
  assert.equal(next.result, 'TURN_LIMIT_REACHED');
  assert.strictEqual(changeDirection(next, 'LEFT'), next);
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

  assert.equal(next.result, 'LOST');
  assert.equal(next.tick, 1);
  assert.deepEqual(next.snake, snake);
  assert.equal(state.result, 'PLAYING');
});
