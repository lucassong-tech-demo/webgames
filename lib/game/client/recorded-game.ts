import type { GameInput } from '../contracts/game-input';
import {
  advanceGame,
  changeDirection,
  createGameState,
  type Direction,
  type GameState,
} from '../engine.ts';

export type RecordedGame = Readonly<{
  game: GameState;
  inputLog: readonly GameInput[];
}>;

export type RecordedGameAction =
  | Readonly<{ type: 'advance' }>
  | Readonly<{ type: 'change-direction'; direction: Direction }>
  | Readonly<{ type: 'reset'; seed: number }>;

export function createRecordedGame(seed: number): RecordedGame {
  return {
    game: createGameState(seed),
    inputLog: [],
  };
}

export function recordedGameReducer(
  state: RecordedGame,
  action: RecordedGameAction,
): RecordedGame {
  switch (action.type) {
    case 'advance': {
      const game = advanceGame(state.game);
      return game === state.game ? state : { ...state, game };
    }
    case 'change-direction': {
      const game = changeDirection(state.game, action.direction);

      if (game === state.game) {
        return state;
      }

      return {
        game,
        inputLog: [
          ...state.inputLog,
          { tick: state.game.tick, direction: action.direction },
        ],
      };
    }
    case 'reset':
      return createRecordedGame(action.seed);
  }
}
