import type {
  FinishGameRequest,
  FinishGameResponse,
} from '../contracts/finish-game';
import type { StartGameResponse } from '../contracts/start-game';

type Fetcher = typeof fetch;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function responseError(value: unknown, fallback: string) {
  return isRecord(value) && typeof value.error === 'string' ? value.error : fallback;
}

async function readJson(response: Response, fallback: string) {
  try {
    return await response.json() as unknown;
  } catch {
    throw new Error(fallback);
  }
}

export async function startGameSession(
  fetcher: Fetcher = fetch,
): Promise<StartGameResponse> {
  const response = await fetcher('/api/games/start', {
    method: 'POST',
    cache: 'no-store',
  });
  const body = await readJson(response, 'Invalid response while starting game');

  if (!response.ok) {
    throw new Error(responseError(body, 'Failed to start game'));
  }

  if (
    !isRecord(body) ||
    typeof body.sessionId !== 'string' ||
    typeof body.seed !== 'number' ||
    !Number.isInteger(body.seed) ||
    body.seed < 0 ||
    body.seed > 0x7fffffff ||
    typeof body.engineVersion !== 'number' ||
    !Number.isInteger(body.engineVersion)
  ) {
    throw new Error('Invalid response while starting game');
  }

  return {
    sessionId: body.sessionId,
    seed: body.seed,
    engineVersion: body.engineVersion,
  };
}

export async function finishGameSession(
  input: FinishGameRequest,
  fetcher: Fetcher = fetch,
): Promise<FinishGameResponse> {
  const response = await fetcher('/api/games/finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    cache: 'no-store',
  });
  const body = await readJson(response, 'Invalid response while finishing game');

  if (!response.ok) {
    throw new Error(responseError(body, 'Failed to save score'));
  }

  if (
    !isRecord(body) ||
    typeof body.finalScore !== 'number' ||
    !Number.isInteger(body.finalScore) ||
    body.finalScore < 0 ||
    body.finalScore !== input.score ||
    typeof body.qualifiedForLeaderboard !== 'boolean'
  ) {
    throw new Error('Invalid response while finishing game');
  }

  return {
    finalScore: body.finalScore,
    qualifiedForLeaderboard: body.qualifiedForLeaderboard,
  };
}
