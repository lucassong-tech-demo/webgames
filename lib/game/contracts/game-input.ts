import type { Direction } from '../engine';

export type GameInput = Readonly<{
  tick: number;
  direction: Direction;
}>;
