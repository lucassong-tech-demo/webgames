import type { GameResult } from '../engine';
import type { TurnLogEntry } from './turn-log';

export type FinishGameRequest = Readonly<{
  sessionId: string;
  playerName: string;
  turnLog: readonly TurnLogEntry[];
  movesAfterLastTurn: string;
}>;

export type FinishGameResponse = Readonly<{
  finalScore: number;
  qualifiedForLeaderboard: boolean;
  result: Exclude<GameResult, 'PLAYING'>;
}>;
