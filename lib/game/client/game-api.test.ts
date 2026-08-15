import assert from 'node:assert/strict';
import test from 'node:test';

import type { FinishGameRequest } from '../contracts/finish-game.ts';
import { finishGameSession, startGameSession } from './game-api.ts';

const finishRequest: FinishGameRequest = {
  sessionId: '123e4567-e89b-42d3-a456-426614174000',
  playerName: 'Player One',
  score: 100,
};

test('starts a game with a validated server session', async () => {
  const fetcher: typeof fetch = async () => Response.json({
    sessionId: finishRequest.sessionId,
    seed: 123,
    engineVersion: 2,
  }, { status: 201 });

  assert.deepEqual(await startGameSession(fetcher), {
    sessionId: finishRequest.sessionId,
    seed: 123,
    engineVersion: 2,
  });
});

test('rejects malformed start responses', async () => {
  const fetcher: typeof fetch = async () => Response.json({
    sessionId: finishRequest.sessionId,
    seed: '123',
    engineVersion: 2,
  }, { status: 201 });

  await assert.rejects(startGameSession(fetcher), /Invalid response/);
});

test('finishes a game with the score displayed by the client', async () => {
  let sentBody: unknown;
  const fetcher: typeof fetch = async (_input, init) => {
    sentBody = JSON.parse(String(init?.body));
    return Response.json({
      finalScore: 100,
      qualifiedForLeaderboard: true,
    });
  };

  assert.deepEqual(await finishGameSession(finishRequest, fetcher), {
    finalScore: 100,
    qualifiedForLeaderboard: true,
  });
  assert.deepEqual(sentBody, finishRequest);
  assert.equal((sentBody as { score: number }).score, 100);
});

test('surfaces safe API errors and rejects malformed finish responses', async () => {
  const failedFetch: typeof fetch = async () => Response.json(
    { error: 'Game session has already been finished' },
    { status: 409 },
  );
  await assert.rejects(
    finishGameSession(finishRequest, failedFetch),
    /already been finished/,
  );

  const malformedFetch: typeof fetch = async () => Response.json({
    finalScore: '198',
    qualifiedForLeaderboard: true,
  });
  await assert.rejects(
    finishGameSession(finishRequest, malformedFetch),
    /Invalid response/,
  );
});
