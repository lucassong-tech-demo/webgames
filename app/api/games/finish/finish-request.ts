import type { FinishGameRequest } from '../../../../lib/game/contracts/finish-game.ts';
import { MAX_SCORE, SCORE_PER_FOOD } from '../../../../lib/game/engine.ts';

export const MAX_FINISH_REQUEST_BODY_BYTES = 1024;

const MAX_PLAYER_NAME_LENGTH = 24;
const PLAYER_NAME_PATTERN = /^[\p{L}\p{N}_-]+(?: [\p{L}\p{N}_-]+)*$/u;
const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export function validateFinishRequest(value: unknown): FinishRequestValidation {
  if (!isRecord(value)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  if (!hasExactKeys(value, ['sessionId', 'playerName', 'score'])) {
    return { ok: false, error: 'Request body has an invalid shape' };
  }

  const { sessionId, playerName, score } = value;

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

  if (
    typeof score !== 'number' ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > MAX_SCORE ||
    score % SCORE_PER_FOOD !== 0
  ) {
    return {
      ok: false,
      error: `score must be an integer from 0 to ${MAX_SCORE} in increments of ${SCORE_PER_FOOD}`,
    };
  }

  return {
    ok: true,
    value: {
      sessionId,
      playerName,
      score,
    },
  };
}
