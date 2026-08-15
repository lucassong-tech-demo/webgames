export const BOARD_SIZE = 20;
export const ENGINE_VERSION = 2;
export const MAX_DIRECTION_CHANGES = 100;
export const SCORE_PER_FOOD = 10;
export const WIN_SNAKE_LENGTH = 100;
export const MAX_SCORE = (WIN_SNAKE_LENGTH - 1) * SCORE_PER_FOOD;

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type GameResult = 'PLAYING' | 'LOST' | 'WON' | 'TURN_LIMIT_REACHED';

export type Position = Readonly<{
  x: number;
  y: number;
}>;

export type GameState = Readonly<{
  seed: number;
  randomState: number;
  tick: number;
  snake: readonly Position[];
  food: Position | null;
  direction: Direction;
  directionChangedAtTick: number | null;
  turnsUsed: number;
  score: number;
  result: GameResult;
}>;

type RandomResult = Readonly<{
  state: number;
  value: number;
}>;

const INITIAL_DIRECTION: Direction = 'RIGHT';
const INITIAL_POSITION: Position = {
  x: Math.floor(BOARD_SIZE / 2),
  y: Math.floor(BOARD_SIZE / 2),
};

const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

function positionsEqual(left: Position, right: Position) {
  return left.x === right.x && left.y === right.y;
}

function normalizeSeed(seed: number) {
  if (!Number.isInteger(seed)) {
    throw new TypeError('seed must be an integer');
  }

  return seed >>> 0;
}

export function nextRandomUint32(state: number): RandomResult {
  const nextState = (normalizeSeed(state) + 0x6d2b79f5) >>> 0;
  let value = nextState;

  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  value = (value ^ (value >>> 14)) >>> 0;

  return { state: nextState, value };
}

function placeFood(snake: readonly Position[], randomState: number) {
  const occupied = new Set(snake.map(({ x, y }) => `${x}:${y}`));
  const available: Position[] = [];

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (!occupied.has(`${x}:${y}`)) {
        available.push({ x, y });
      }
    }
  }

  if (available.length === 0) {
    return { food: null, randomState };
  }

  const random = nextRandomUint32(randomState);
  return {
    food: available[random.value % available.length],
    randomState: random.state,
  };
}

export function createGameState(seed: number): GameState {
  const normalizedSeed = normalizeSeed(seed);
  const snake = [INITIAL_POSITION];
  const placement = placeFood(snake, normalizedSeed);

  return {
    seed: normalizedSeed,
    randomState: placement.randomState,
    tick: 0,
    snake,
    food: placement.food,
    direction: INITIAL_DIRECTION,
    directionChangedAtTick: null,
    turnsUsed: 0,
    score: 0,
    result: 'PLAYING',
  };
}

export function changeDirection(state: GameState, direction: Direction): GameState {
  if (
    state.result !== 'PLAYING' ||
    state.turnsUsed >= MAX_DIRECTION_CHANGES ||
    state.directionChangedAtTick === state.tick ||
    OPPOSITE_DIRECTION[state.direction] === direction
  ) {
    return state;
  }

  return direction === state.direction
    ? state
    : {
        ...state,
        direction,
        directionChangedAtTick: state.tick,
        turnsUsed: state.turnsUsed + 1,
      };
}

function moveHead(head: Position, direction: Direction): Position {
  switch (direction) {
    case 'UP':
      return { x: head.x, y: (head.y - 1 + BOARD_SIZE) % BOARD_SIZE };
    case 'DOWN':
      return { x: head.x, y: (head.y + 1) % BOARD_SIZE };
    case 'LEFT':
      return { x: (head.x - 1 + BOARD_SIZE) % BOARD_SIZE, y: head.y };
    case 'RIGHT':
      return { x: (head.x + 1) % BOARD_SIZE, y: head.y };
  }
}

export function advanceGame(state: GameState): GameState {
  if (state.result !== 'PLAYING') {
    return state;
  }

  const head = moveHead(state.snake[0], state.direction);
  const nextTick = state.tick + 1;

  if (state.snake.slice(1).some(segment => positionsEqual(segment, head))) {
    return { ...state, tick: nextTick, result: 'LOST' };
  }

  const ateFood = state.food !== null && positionsEqual(head, state.food);
  const snake = [head, ...state.snake];

  if (!ateFood) {
    snake.pop();
    return {
      ...state,
      tick: nextTick,
      snake,
      result:
        state.turnsUsed >= MAX_DIRECTION_CHANGES
          ? 'TURN_LIMIT_REACHED'
          : 'PLAYING',
    };
  }

  const score = state.score + SCORE_PER_FOOD;

  if (snake.length >= WIN_SNAKE_LENGTH) {
    return {
      ...state,
      tick: nextTick,
      snake,
      food: null,
      score,
      result: 'WON',
    };
  }

  if (state.turnsUsed >= MAX_DIRECTION_CHANGES) {
    return {
      ...state,
      tick: nextTick,
      snake,
      food: null,
      score,
      result: 'TURN_LIMIT_REACHED',
    };
  }

  const placement = placeFood(snake, state.randomState);
  return {
    ...state,
    randomState: placement.randomState,
    tick: nextTick,
    snake,
    food: placement.food,
    score,
  };
}
