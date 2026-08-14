import type { FinishGameRequest } from '../../../../lib/game/contracts/finish-game.ts';
import {
  MAX_DIRECTION_CHANGES,
  type Direction,
} from '../../../../lib/game/engine.ts';
import { MAX_REPLAY_MOVES } from '../../../../lib/game/server/replay-game.ts';

export const MAX_FINISH_REQUEST_BODY_BYTES = 16 * 1024;

const MAX_PLAYER_NAME_LENGTH = 24;
const PLAYER_NAME_PATTERN = /^[\p{L}\p{N}_-]+(?: [\p{L}\p{N}_-]+)*$/u;
const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MOVE_COUNT_PATTERN = /^(0|[1-9]\d{0,5})$/;
const DIRECTIONS = new Set<Direction>(['UP', 'DOWN', 'LEFT', 'RIGHT']);

type FinishRequestValidation =
  | Readonly<{ ok: true; value: FinishGameRequest }>
  | Readonly<{ ok: false; error: string }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every(key => keys.includes(key));
}

function isMoveCount(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    MOVE_COUNT_PATTERN.test(value) &&
    Number(value) <= MAX_REPLAY_MOVES
  );
}

export function validateFinishRequest(value: unknown): FinishRequestValidation {
  if (!isRecord(value)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  if (!hasExactKeys(value, ['sessionId', 'playerName', 'turnLog', 'movesAfterLastTurn'])) {
    return { ok: false, error: 'Request body has an invalid shape' };
  }

  const { sessionId, playerName, turnLog, movesAfterLastTurn } = value;

  if (typeof sessionId !== 'string' || !SESSION_ID_PATTERN.test(sessionId)) {
    return { ok: false, error: 'sessionId must be a valid UUID' };
  }

  if (
    typeof playerName !== 'string' ||
    Array.from(playerName).length < 1 ||
    Array.from(playerName).length > MAX_PLAYER_NAME_LENGTH ||
    !PLAYER_NAME_PATTERN.test(playerName)
  ) {
    return {
      ok: false,
      error: 'playerName must be 1-24 letters, numbers, spaces, underscores, or hyphens',
    };
  }

  if (!Array.isArray(turnLog) || turnLog.length > MAX_DIRECTION_CHANGES) {
    return { ok: false, error: 'turnLog must contain at most 100 turns' };
  }

  let totalMoves = 0;
  const validatedTurns = [];

  for (const turn of turnLog) {
    if (
      !isRecord(turn) ||
      !hasExactKeys(turn, ['movesSincePreviousTurn', 'direction']) ||
      !isMoveCount(turn.movesSincePreviousTurn) ||
      typeof turn.direction !== 'string' ||
      !DIRECTIONS.has(turn.direction as Direction)
    ) {
      return { ok: false, error: 'turnLog contains an invalid turn' };
    }

    totalMoves += Number(turn.movesSincePreviousTurn);
    validatedTurns.push({
      movesSincePreviousTurn: turn.movesSincePreviousTurn,
      direction: turn.direction as Direction,
    });
  }

  if (!isMoveCount(movesAfterLastTurn)) {
    return { ok: false, error: 'movesAfterLastTurn must be a valid move count' };
  }

  totalMoves += Number(movesAfterLastTurn);
  if (totalMoves > MAX_REPLAY_MOVES) {
    return { ok: false, error: 'The operation log contains too many moves' };
  }

  return {
    ok: true,
    value: {
      sessionId,
      playerName,
      turnLog: validatedTurns,
      movesAfterLastTurn,
    },
  };
}
