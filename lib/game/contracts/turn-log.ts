import type { Direction } from '../engine';

export type TurnLogEntry = Readonly<{
  movesSincePreviousTurn: string;
  direction: Direction;
}>;
