import type { FinishGameRequest } from '../contracts/finish-game.ts';
import {
  advanceGame,
  changeDirection,
  createGameState,
  MAX_DIRECTION_CHANGES,
  type GameResult,
  type GameState,
} from '../engine.ts';

export const MAX_REPLAY_MOVES = 600_000;

export class InvalidReplayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidReplayError';
  }
}

export type FinishedGameState = GameState & {
  result: Exclude<GameResult, 'PLAYING'>;
};

function advanceExact(state: GameState, moves: number) {
  let next = state;

  for (let move = 0; move < moves; move += 1) {
    if (next.result !== 'PLAYING') {
      throw new InvalidReplayError('The operation log continues after the game ended');
    }

    next = advanceGame(next);
  }

  return next;
}

export function replayGame(
  seed: number,
  input: Pick<FinishGameRequest, 'turnLog' | 'movesAfterLastTurn'>,
): FinishedGameState {
  let state = createGameState(seed);

  for (const turn of input.turnLog) {
    state = advanceExact(state, Number(turn.movesSincePreviousTurn));

    const changed = changeDirection(state, turn.direction);
    if (changed === state) {
      throw new InvalidReplayError('The operation log contains a rejected turn');
    }

    state = changed;
  }

  state = advanceExact(state, Number(input.movesAfterLastTurn));

  if (state.result === 'PLAYING') {
    throw new InvalidReplayError('The operation log does not reach a finished game');
  }

  return state as FinishedGameState;
}

export function calculateFinalScore(state: GameState) {
  if (state.result === 'PLAYING') {
    throw new InvalidReplayError('A running game does not have a final score');
  }

  const remainingTurns = MAX_DIRECTION_CHANGES - state.turnsUsed;
  const efficiencyBonus = Math.log1p(remainingTurns) / Math.log1p(MAX_DIRECTION_CHANGES);

  return Math.round(state.score * (1 + efficiencyBonus));
}
