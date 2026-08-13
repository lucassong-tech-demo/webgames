const MAX_PLAYER_NAME_LENGTH = 24;
const MAX_SCORE = 3990;
const PLAYER_NAME_PATTERN = /^[\p{L}\p{N}_-]+(?: [\p{L}\p{N}_-]+)*$/u;

export type ScoreSubmission = {
  playerName: string;
  score: number;
};

export type ScoreSubmissionValidation =
  | { ok: true; value: ScoreSubmission }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateScoreSubmission(value: unknown): ScoreSubmissionValidation {
  if (!isRecord(value)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  const keys = Object.keys(value);
  if (keys.length !== 2 || !keys.includes('playerName') || !keys.includes('score')) {
    return { ok: false, error: 'Request body must contain only playerName and score' };
  }

  const { playerName, score } = value;
  if (typeof playerName !== 'string') {
    return { ok: false, error: 'playerName must be a string' };
  }

  const playerNameLength = Array.from(playerName).length;
  if (
    playerNameLength < 1 ||
    playerNameLength > MAX_PLAYER_NAME_LENGTH ||
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
    score % 10 !== 0
  ) {
    return {
      ok: false,
      error: 'score must be an integer from 0 to 3990 in increments of 10',
    };
  }

  return { ok: true, value: { playerName, score } };
}
