import {
  advanceGame,
  changeDirection,
  createGameState,
  type Direction,
  type GameState,
} from '../engine.ts';

export type GameAction =
  | Readonly<{ type: 'advance' }>
  | Readonly<{ type: 'change-direction'; direction: Direction }>
  | Readonly<{ type: 'reset'; seed: number }>;

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'advance':
      return advanceGame(state);
    case 'change-direction':
      return changeDirection(state, action.direction);
    case 'reset':
      return createGameState(action.seed);
  }
}
