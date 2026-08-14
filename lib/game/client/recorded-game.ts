import type { TurnLogEntry } from '../contracts/turn-log';
import {
  advanceGame,
  changeDirection,
  createGameState,
  type Direction,
  type GameState,
} from '../engine.ts';

export type RecordedGame = Readonly<{
  game: GameState;
  turnLog: readonly TurnLogEntry[];
  previousTurnTick: number;
}>;

export type RecordedGameAction =
  | Readonly<{ type: 'advance' }>
  | Readonly<{ type: 'change-direction'; direction: Direction }>
  | Readonly<{ type: 'reset'; seed: number }>;

export function createRecordedGame(seed: number): RecordedGame {
  return {
    game: createGameState(seed),
    turnLog: [],
    previousTurnTick: 0,
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
        turnLog: [
          ...state.turnLog,
          {
            movesSincePreviousTurn: String(state.game.tick - state.previousTurnTick),
            direction: action.direction,
          },
        ],
        previousTurnTick: state.game.tick,
      };
    }
    case 'reset':
      return createRecordedGame(action.seed);
  }
}

export function getMovesAfterLastTurn(state: RecordedGame) {
  return String(state.game.tick - state.previousTurnTick);
}
