export const BOARD_SIZE = 20;
export const ENGINE_VERSION = 1;
export const SCORE_PER_FOOD = 10;

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

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
  score: number;
  gameOver: boolean;
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
    score: 0,
    gameOver: false,
  };
}

export function changeDirection(state: GameState, direction: Direction): GameState {
  if (
    state.gameOver ||
    state.directionChangedAtTick === state.tick ||
    OPPOSITE_DIRECTION[state.direction] === direction
  ) {
    return state;
  }

  return direction === state.direction
    ? state
    : { ...state, direction, directionChangedAtTick: state.tick };
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
  if (state.gameOver) {
    return state;
  }

  const head = moveHead(state.snake[0], state.direction);
  const nextTick = state.tick + 1;

  if (state.snake.slice(1).some(segment => positionsEqual(segment, head))) {
    return { ...state, tick: nextTick, gameOver: true };
  }

  const ateFood = state.food !== null && positionsEqual(head, state.food);
  const snake = [head, ...state.snake];

  if (!ateFood) {
    snake.pop();
    return { ...state, tick: nextTick, snake };
  }

  const placement = placeFood(snake, state.randomState);
  return {
    ...state,
    randomState: placement.randomState,
    tick: nextTick,
    snake,
    food: placement.food,
    score: state.score + SCORE_PER_FOOD,
    gameOver: placement.food === null,
  };
}
